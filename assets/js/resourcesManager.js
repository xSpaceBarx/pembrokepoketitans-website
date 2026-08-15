import { app, db } from "./firebase.js";

import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    writeBatch,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
    getAuth
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const WORKER_URL =
    "https://poketitan-notifications.xspacebarx.workers.dev/";

const SECTION_CONFIG = {
    quickguides: {
        label: "📚 Quick Guides",
        type: "image"
    },
    websites: {
        label: "🌐 Useful Websites",
        type: "link"
    },
    podcasts: {
        label: "🎙️ Podcasts",
        type: "link"
    },
    socials: {
        label: "📱 Socials",
        type: "link"
    },
    communities: {
        label: "🤝 Community Links",
        type: "link"
    }
};

const resourcesCollection =
    collection(db, "resources");

const communitySubmissionsCollection =
    collection(
        db,
        "communitySubmissions"
    );

let allResources = [];
let communitySubmissions = [];
let editingResource = null;

function getElement(id) {
    return document.getElementById(id);
}

function safeHttpUrl(value) {
    try {
        const url = new URL(String(value || "").trim());
        if (
            url.protocol === "http:" ||
            url.protocol === "https:"
        ) {
            return url.href;
        }
    } catch {
        // Invalid URL.
    }
    return "";
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = String(reader.result || "");
            const commaIndex = result.indexOf(",");
            if (commaIndex < 0) {
                reject(new Error("Unable to read the image file."));
                return;
            }
            resolve(result.slice(commaIndex + 1));
        };
        reader.onerror = () => {
            reject(new Error("Unable to read the image file."));
        };
        reader.readAsDataURL(file);
    });
}

async function getAdminIdToken() {
    const auth = getAuth(app);
    const user = auth.currentUser;
    if (!user) {
        throw new Error(
            "Your Admin login has expired. Please refresh the page and sign in again."
        );
    }
    return user.getIdToken();
}

async function readWorkerJson(response) {
    const text = await response.text();
    if (!text) return {};
    try {
        return JSON.parse(text);
    } catch {
        return {
            success: false,
            error: text
        };
    }
}

async function uploadManagedGuide(file) {
    if (!file) {
        throw new Error("Please choose a Quick Guide image.");
    }

    if (
        ![
            "image/png",
            "image/jpeg",
            "image/webp"
        ].includes(file.type)
    ) {
        throw new Error(
            "Only PNG, JPEG and WebP images are supported."
        );
    }

    if (file.size > 25 * 1024 * 1024) {
        throw new Error("Image must be 25 MB or smaller.");
    }

    const contentBase64 =
        await fileToBase64(file);

    const githubPayload =
        JSON.stringify({
            message:
                "Add PokéTitans resource quick guide",
            content:
                contentBase64,
            branch:
                "main"
        });

    const idToken =
        await getAdminIdToken();

    const params =
        new URLSearchParams({
            type:
                "resource-quickguide",
            mime:
                file.type,
            name:
                file.name,
            size:
                String(file.size)
        });

    const response =
        await fetch(
            `${WORKER_URL}graphics/upload?${params.toString()}`,
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/json",
                    "Authorization":
                        `Bearer ${idToken}`
                },
                body:
                    githubPayload
            }
        );

    const result =
        await readWorkerJson(response);

    if (
        !response.ok ||
        result.success !== true ||
        !result.imagePath ||
        !result.imageUrl
    ) {
        throw new Error(
            result.error ||
            "Unable to upload the Quick Guide image."
        );
    }

    return result;
}

async function deleteManagedImage(imagePath) {
    if (!imagePath) {
        return {
            success: true,
            skipped: true
        };
    }

    const idToken =
        await getAdminIdToken();

    const response =
        await fetch(
            WORKER_URL,
            {
                method: "DELETE",
                headers: {
                    "Content-Type":
                        "application/json",
                    "Authorization":
                        `Bearer ${idToken}`
                },
                body:
                    JSON.stringify({
                        action:
                            "deleteGraphic",
                        imagePath
                    })
            }
        );

    const result =
        await readWorkerJson(response);

    if (
        !response.ok ||
        result.success !== true
    ) {
        throw new Error(
            result.error ||
            "Unable to remove the managed image from GitHub."
        );
    }

    return result;
}

function inferCommunityPlatform(
    value
) {

    try {

        const host =
            new URL(
                value
            ).hostname
                .toLowerCase();

        if (
            host ===
                "discord.gg" ||
            host ===
                "discord.com" ||
            host.endsWith(
                ".discord.com"
            )
        ) {
            return "Discord";
        }

        if (
            host ===
                "cmpf.re" ||
            host ===
                "campfire.onelink.me" ||
            host.includes(
                "campfire"
            )
        ) {
            return "Campfire";
        }

    } catch {
        // Invalid URL handled elsewhere.
    }

    return "";
}

function ensureCommunityAdminUi() {

    const sectionSelect =
        getElement(
            "resource-admin-section"
        );

    if (
        sectionSelect &&
        !Array.from(
            sectionSelect.options
        ).some(
            option =>
                option.value ===
                "communities"
        )
    ) {
        const option =
            document.createElement(
                "option"
            );

        option.value =
            "communities";

        option.textContent =
            "🤝 Community Links";

        sectionSelect.appendChild(
            option
        );
    }

    const linkFields =
        getElement(
            "resource-link-fields"
        );

    if (
        linkFields &&
        !getElement(
            "resource-community-fields"
        )
    ) {

        const wrap =
            document.createElement(
                "div"
            );

        wrap.id =
            "resource-community-fields";

        wrap.style.display =
            "none";

        const platformLabel =
            document.createElement(
                "label"
            );

        platformLabel.htmlFor =
            "resource-community-platform";

        platformLabel.textContent =
            "Community Platform";

        const platform =
            document.createElement(
                "select"
            );

        platform.id =
            "resource-community-platform";

        [
            [
                "",
                "Select Discord or Campfire"
            ],
            [
                "Discord",
                "Discord"
            ],
            [
                "Campfire",
                "Campfire"
            ]
        ].forEach(
            (
                [
                    value,
                    label
                ]
            ) => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    value;

                option.textContent =
                    label;

                platform.appendChild(
                    option
                );
            }
        );

        const areaLabel =
            document.createElement(
                "label"
            );

        areaLabel.htmlFor =
            "resource-community-area";

        areaLabel.textContent =
            "Community Area / Town";

        const area =
            document.createElement(
                "input"
            );

        area.type =
            "text";

        area.id =
            "resource-community-area";

        area.maxLength =
            80;

        area.placeholder =
            "South Shore, Plymouth, Quincy, etc.";

        wrap.append(
            platformLabel,
            platform,
            areaLabel,
            area
        );

        linkFields.appendChild(
            wrap
        );
    }

    const manager =
        getElement(
            "resources-manager"
        );

    if (
        manager &&
        !getElement(
            "community-submissions-admin"
        )
    ) {

        const section =
            document.createElement(
                "div"
            );

        section.id =
            "community-submissions-admin";

        section.innerHTML = `
            <br>
            <hr>
            <h3>📨 Community Link Submissions</h3>
            <p class="section-description" style="text-align:left;margin:0 0 12px;">
                Links submitted from the public Resources page stay hidden until you approve them here.
            </p>
            <p
                id="community-submission-count"
                class="draft-counts">
                Loading submissions...
            </p>
            <div id="community-submission-list">
                Loading submissions...
            </div>
        `;

        manager.appendChild(
            section
        );
    }
}

function currentSection() {
    const value =
        getElement("resource-admin-section")?.value ||
        "quickguides";

    return SECTION_CONFIG[value]
        ? value
        : "quickguides";
}

function resourcesForSection(section) {
    return allResources
        .filter(item => item.section === section)
        .sort((a, b) => {
            const aOrder =
                Number.isFinite(Number(a.order))
                    ? Number(a.order)
                    : 999999;
            const bOrder =
                Number.isFinite(Number(b.order))
                    ? Number(b.order)
                    : 999999;
            if (aOrder !== bOrder) {
                return aOrder - bOrder;
            }
            return String(
                a.internalName ||
                a.title ||
                ""
            ).localeCompare(
                String(
                    b.internalName ||
                    b.title ||
                    ""
                )
            );
        });
}

function nextOrder(section) {
    const items = resourcesForSection(section);
    if (!items.length) return 1;
    return Math.max(
        ...items.map(item =>
            Number.isFinite(Number(item.order))
                ? Number(item.order)
                : 0
        )
    ) + 1;
}

function updateEditorMode() {
    const section = currentSection();
    const config = SECTION_CONFIG[section];

    const quickFields =
        getElement("resource-quickguide-fields");
    const linkFields =
        getElement("resource-link-fields");
    const communityFields =
        getElement("resource-community-fields");

    if (quickFields) {
        quickFields.style.display =
            config.type === "image"
                ? "block"
                : "none";
    }

    if (linkFields) {
        linkFields.style.display =
            config.type === "link"
                ? "block"
                : "none";
    }

    if (communityFields) {
        communityFields.style.display =
            section === "communities"
                ? "block"
                : "none";
    }

    const heading =
        getElement("resource-editor-title");

    if (heading && !editingResource) {
        heading.textContent =
            `➕ Add ${config.label.replace(/^\S+\s*/, "")}`;
    }

    renderResourceList();
}

function clearCurrentImagePreview() {
    const wrap =
        getElement("resource-current-image-wrap");
    const image =
        getElement("resource-current-image");

    if (wrap) {
        wrap.style.display = "none";
    }
    if (image) {
        image.removeAttribute("src");
        image.alt = "";
    }
}

function showCurrentImagePreview(resource) {
    const wrap =
        getElement("resource-current-image-wrap");
    const image =
        getElement("resource-current-image");

    const source =
        safeHttpUrl(
            resource?.imageUrl ||
            resource?.imagePath ||
            ""
        );

    if (!wrap || !image || !source) {
        clearCurrentImagePreview();
        return;
    }

    image.src = source;
    image.alt =
        resource.altText ||
        resource.internalName ||
        "Current Quick Guide";
    wrap.style.display = "block";
}

function clearEditor({ keepSection = true } = {}) {
    editingResource = null;

    getElement("resource-admin-section").disabled = false;
    getElement("resource-admin-id").value = "";
    getElement("resource-internal-name").value = "";
    getElement("resource-alt-text").value = "";
    getElement("resource-image").value = "";
    getElement("resource-title").value = "";
    getElement("resource-description").value = "";
    getElement("resource-url").value = "";

    if (
        getElement(
            "resource-community-platform"
        )
    ) {
        getElement(
            "resource-community-platform"
        ).value = "";
    }

    if (
        getElement(
            "resource-community-area"
        )
    ) {
        getElement(
            "resource-community-area"
        ).value = "";
    }

    getElement("resource-active").checked = true;

    if (!keepSection) {
        getElement("resource-admin-section").value =
            "quickguides";
    }

    clearCurrentImagePreview();

    getElement("saveResource").textContent =
        "💾 Save Resource";

    updateEditorMode();
}

function editResource(resource) {
    editingResource = resource;

    getElement("resource-admin-id").value =
        resource.id;
    getElement("resource-admin-section").value =
        resource.section;
    getElement("resource-admin-section").disabled = true;
    getElement("resource-internal-name").value =
        resource.internalName || "";
    getElement("resource-alt-text").value =
        resource.altText || "";
    getElement("resource-image").value = "";
    getElement("resource-title").value =
        resource.title || "";
    getElement("resource-description").value =
        resource.description || "";
    getElement("resource-url").value =
        resource.url || "";

    if (
        getElement(
            "resource-community-platform"
        )
    ) {
        getElement(
            "resource-community-platform"
        ).value =
            resource.platform ||
            inferCommunityPlatform(
                resource.url
            ) ||
            "";
    }

    if (
        getElement(
            "resource-community-area"
        )
    ) {
        getElement(
            "resource-community-area"
        ).value =
            resource.area ||
            "";
    }

    getElement("resource-active").checked =
        resource.active !== false;

    const config =
        SECTION_CONFIG[resource.section];

    getElement("resource-editor-title").textContent =
        `✏ Edit ${config?.label || "Resource"}`;
    getElement("saveResource").textContent =
        "💾 Save Changes";

    showCurrentImagePreview(resource);
    updateEditorMode();

    getElement("resources-manager")
        ?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
}

async function loadResources() {
    const snapshot =
        await getDocs(resourcesCollection);

    allResources = snapshot.docs.map(item => ({
        id: item.id,
        ...item.data()
    }));

    renderResourceList();
}

function createButton(text, className, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = text;
    button.addEventListener("click", handler);
    return button;
}

function renderResourceList() {
    const container =
        getElement("resource-admin-list");
    const count =
        getElement("resource-admin-count");

    if (!container || !count) return;

    const section = currentSection();
    const config = SECTION_CONFIG[section];
    const items = resourcesForSection(section);

    count.textContent =
        `${config.label}: ${items.length} item${items.length === 1 ? "" : "s"}`;

    container.innerHTML = "";

    if (!items.length) {
        const empty = document.createElement("p");
        empty.className = "empty-section";
        empty.textContent =
            "No managed resources in this section yet.";
        container.appendChild(empty);
        return;
    }

    items.forEach((resource, index) => {
        const card = document.createElement("div");
        card.className = "resource-admin-card";

        const body = document.createElement("div");
        body.className = "resource-admin-card-body";

        if (section === "quickguides") {
            const source = safeHttpUrl(
                resource.imageUrl ||
                resource.imagePath ||
                ""
            );
            if (source) {
                const image = document.createElement("img");
                image.className = "resource-admin-thumb";
                image.src = source;
                image.alt =
                    resource.altText ||
                    resource.internalName ||
                    "Quick Guide";
                body.appendChild(image);
            }
        }

        const textWrap = document.createElement("div");
        textWrap.className = "resource-admin-card-text";

        const title = document.createElement("h3");
        title.textContent =
            resource.internalName ||
            resource.title ||
            "Untitled Resource";
        textWrap.appendChild(title);

        const status = document.createElement("p");
        status.className =
            resource.active === false
                ? "resource-admin-hidden"
                : "resource-admin-visible";
        status.textContent =
            resource.active === false
                ? "⚪ Hidden"
                : "🟢 Visible";
        textWrap.appendChild(status);

        if (
            section ===
                "communities"
        ) {
            const meta =
                document.createElement(
                    "p"
                );

            meta.textContent =
                [
                    resource.platform ||
                        inferCommunityPlatform(
                            resource.url
                        ) ||
                        "Community",
                    resource.area || ""
                ]
                    .filter(
                        Boolean
                    )
                    .join(
                        " • "
                    );

            textWrap.appendChild(
                meta
            );
        }

        if (
            section !== "quickguides" &&
            resource.description
        ) {
            const description = document.createElement("p");
            description.textContent = resource.description;
            textWrap.appendChild(description);
        }

        body.appendChild(textWrap);
        card.appendChild(body);

        const buttons = document.createElement("div");
        buttons.className = "resource-admin-buttons";

        const up = createButton(
            "↑ Up",
            "btn-orange",
            () => moveResource(resource.id, -1)
        );
        up.disabled = index === 0;
        buttons.appendChild(up);

        const down = createButton(
            "↓ Down",
            "btn-orange",
            () => moveResource(resource.id, 1)
        );
        down.disabled = index === items.length - 1;
        buttons.appendChild(down);

        buttons.appendChild(
            createButton(
                "✏ Edit",
                "btn-orange",
                () => editResource(resource)
            )
        );

        buttons.appendChild(
            createButton(
                resource.active === false
                    ? "👁 Show"
                    : "🙈 Hide",
                "btn-orange",
                () => toggleResource(resource)
            )
        );

        buttons.appendChild(
            createButton(
                "🗑 Delete",
                "btn-orange resource-delete-button",
                () => removeResource(resource)
            )
        );

        card.appendChild(buttons);
        container.appendChild(card);
    });
}

async function saveResource() {
    const section = currentSection();
    const config = SECTION_CONFIG[section];
    const id = getElement("resource-admin-id").value;
    const active = getElement("resource-active").checked;

    const existing = id
        ? allResources.find(item => item.id === id) || null
        : null;

    let uploadedImage = null;
    const selectedFile =
        getElement("resource-image").files[0] || null;

    try {
        const payload = {
            section,
            active,
            order:
                existing?.order ??
                nextOrder(section),
            updatedAt:
                serverTimestamp()
        };

        if (config.type === "image") {
            const internalName =
                getElement("resource-internal-name").value.trim();
            const altText =
                getElement("resource-alt-text").value.trim();

            if (!internalName) {
                throw new Error(
                    "Please enter an Internal Name for this Quick Guide."
                );
            }

            if (!altText) {
                throw new Error(
                    "Please enter Alt Text for this Quick Guide."
                );
            }

            if (!selectedFile && !existing?.imagePath) {
                throw new Error(
                    "Please choose a Quick Guide image."
                );
            }

            if (selectedFile) {
                uploadedImage =
                    await uploadManagedGuide(selectedFile);
            }

            payload.internalName = internalName;
            payload.altText = altText;
            payload.title = "";
            payload.description = "";
            payload.url = "";
            payload.imagePath =
                uploadedImage?.imagePath ||
                existing?.imagePath ||
                "";
            payload.imageUrl =
                uploadedImage?.imageUrl ||
                existing?.imageUrl ||
                "";
            payload.githubSha =
                uploadedImage?.githubSha ||
                existing?.githubSha ||
                "";
            payload.originalFileName =
                uploadedImage?.originalFileName ||
                existing?.originalFileName ||
                "";
            payload.platform = "";
            payload.area = "";

        } else {
            const title =
                getElement("resource-title").value.trim();
            const description =
                getElement("resource-description").value.trim();
            const url = safeHttpUrl(
                getElement("resource-url").value
            );

            if (!title) {
                throw new Error("Please enter a Title.");
            }
            if (!description) {
                throw new Error("Please enter a Description.");
            }
            if (!url) {
                throw new Error(
                    "Please enter a valid http:// or https:// URL."
                );
            }

            payload.title = title;
            payload.description = description;
            payload.url = url;
            payload.internalName = "";
            payload.altText = "";
            payload.imagePath = "";
            payload.imageUrl = "";
            payload.githubSha = "";
            payload.originalFileName = "";

            if (
                section ===
                    "communities"
            ) {
                const platform =
                    getElement(
                        "resource-community-platform"
                    )?.value ||
                    inferCommunityPlatform(
                        url
                    );

                const area =
                    getElement(
                        "resource-community-area"
                    )?.value
                        .trim() ||
                    "";

                if (
                    ![
                        "Discord",
                        "Campfire"
                    ].includes(
                        platform
                    )
                ) {
                    throw new Error(
                        "Please select Discord or Campfire."
                    );
                }

                if (!area) {
                    throw new Error(
                        "Please enter the Community Area / Town."
                    );
                }

                payload.platform =
                    platform;

                payload.area =
                    area;

            } else {
                payload.platform = "";
                payload.area = "";
            }
        }

        if (id) {
            await updateDoc(
                doc(db, "resources", id),
                payload
            );
        } else {
            payload.createdAt = serverTimestamp();
            await addDoc(resourcesCollection, payload);
        }

        let cleanupWarning = false;

        if (
            uploadedImage &&
            existing?.imagePath &&
            existing.imagePath !== uploadedImage.imagePath
        ) {
            try {
                await deleteManagedImage(existing.imagePath);
            } catch (error) {
                cleanupWarning = true;
                console.warn(
                    "Resource saved, but the replaced image could not be removed:",
                    error
                );
            }
        }

        await loadResources();
        clearEditor({ keepSection: true });

        alert(
            "✅ Resource saved successfully." +
            (
                cleanupWarning
                    ? "\n\nThe new resource is saved, but the older managed image could not be removed automatically."
                    : ""
            )
        );

    } catch (error) {
        if (uploadedImage?.imagePath) {
            try {
                await deleteManagedImage(uploadedImage.imagePath);
            } catch (rollbackError) {
                console.warn(
                    "Unable to roll back the newly uploaded resource image:",
                    rollbackError
                );
            }
        }

        console.error("Unable to save resource:", error);
        alert(
            error.message ||
            "Unable to save the resource."
        );
    }
}

async function toggleResource(resource) {
    try {
        await updateDoc(
            doc(db, "resources", resource.id),
            {
                active:
                    resource.active === false,
                updatedAt:
                    serverTimestamp()
            }
        );
        await loadResources();
    } catch (error) {
        console.error("Unable to update resource visibility:", error);
        alert("Unable to update resource visibility.");
    }
}

async function moveResource(id, direction) {
    const section = currentSection();
    const items = resourcesForSection(section);
    const index = items.findIndex(item => item.id === id);
    const targetIndex = index + direction;

    if (
        index < 0 ||
        targetIndex < 0 ||
        targetIndex >= items.length
    ) {
        return;
    }

    const current = items[index];
    const target = items[targetIndex];

    /*
     * Normalize the displayed order to 1..N while swapping the two
     * selected positions. This keeps ordering deterministic even if
     * older records have duplicate/missing order numbers.
     */
    const reordered = [...items];
    reordered[index] = target;
    reordered[targetIndex] = current;

    try {
        const batch = writeBatch(db);
        reordered.forEach((item, itemIndex) => {
            batch.update(
                doc(db, "resources", item.id),
                {
                    order: itemIndex + 1,
                    updatedAt: serverTimestamp()
                }
            );
        });
        await batch.commit();
        await loadResources();
    } catch (error) {
        console.error("Unable to reorder resources:", error);
        alert("Unable to reorder resources.");
    }
}

async function removeResource(resource) {
    const label =
        resource.internalName ||
        resource.title ||
        "this resource";

    const confirmed = confirm(
        `Delete “${label}”?`
    );

    if (!confirmed) return;

    try {
        if (resource.imagePath) {
            await deleteManagedImage(resource.imagePath);
        }

        await deleteDoc(
            doc(db, "resources", resource.id)
        );

        if (editingResource?.id === resource.id) {
            clearEditor({ keepSection: true });
        }

        await loadResources();

    } catch (error) {
        console.error("Unable to delete resource:", error);
        alert(
            error.message ||
            "Unable to delete the resource."
        );
    }
}

async function loadCommunitySubmissions() {

    const snapshot =
        await getDocs(
            communitySubmissionsCollection
        );

    communitySubmissions =
        snapshot.docs
            .map(
                item => ({
                    id:
                        item.id,
                    ...item.data()
                })
            )
            .filter(
                item =>
                    item.status ===
                    "pending"
            )
            .sort(
                (
                    a,
                    b
                ) => {

                    const aTime =
                        a.createdAt
                            ?.toMillis?.() ||
                        0;

                    const bTime =
                        b.createdAt
                            ?.toMillis?.() ||
                        0;

                    return (
                        aTime -
                        bTime
                    );
                }
            );

    renderCommunitySubmissions();
}

function renderCommunitySubmissions() {

    const container =
        getElement(
            "community-submission-list"
        );

    const count =
        getElement(
            "community-submission-count"
        );

    if (
        !container ||
        !count
    ) {
        return;
    }

    count.textContent =
        communitySubmissions.length
            ? `${communitySubmissions.length} pending approval${communitySubmissions.length === 1 ? "" : "s"}`
            : "No community links are waiting for approval.";

    container.innerHTML =
        "";

    if (
        !communitySubmissions.length
    ) {
        return;
    }

    communitySubmissions.forEach(
        submission => {

            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "resource-admin-card";

            const body =
                document.createElement(
                    "div"
                );

            body.className =
                "resource-admin-card-text";

            const title =
                document.createElement(
                    "h3"
                );

            title.textContent =
                submission.communityName ||
                "Untitled Community";

            const meta =
                document.createElement(
                    "p"
                );

            meta.textContent =
                [
                    submission.platform ||
                        "Community",
                    submission.area ||
                        ""
                ]
                    .filter(
                        Boolean
                    )
                    .join(
                        " • "
                    );

            body.append(
                title,
                meta
            );

            if (
                submission.description
            ) {
                const description =
                    document.createElement(
                        "p"
                    );

                description.textContent =
                    submission.description;

                body.appendChild(
                    description
                );
            }

            const url =
                safeHttpUrl(
                    submission.url
                );

            if (url) {
                const link =
                    document.createElement(
                        "a"
                    );

                link.href =
                    url;

                link.target =
                    "_blank";

                link.rel =
                    "noopener noreferrer";

                link.className =
                    "hero-button";

                link.textContent =
                    "Open Submitted Link";

                body.appendChild(
                    link
                );
            }

            card.appendChild(
                body
            );

            const buttons =
                document.createElement(
                    "div"
                );

            buttons.className =
                "resource-admin-buttons";

            buttons.append(
                createButton(
                    "✅ Approve",
                    "btn-orange",
                    () =>
                        approveCommunitySubmission(
                            submission
                        )
                ),
                createButton(
                    "🗑 Reject",
                    "btn-orange resource-delete-button",
                    () =>
                        rejectCommunitySubmission(
                            submission
                        )
                )
            );

            card.appendChild(
                buttons
            );

            container.appendChild(
                card
            );
        }
    );
}

async function approveCommunitySubmission(
    submission
) {

    const url =
        safeHttpUrl(
            submission.url
        );

    if (!url) {
        alert(
            "This submission does not contain a valid URL."
        );
        return;
    }

    const confirmed =
        confirm(
            `Approve “${submission.communityName || "this community"}” and publish it on Resources?`
        );

    if (!confirmed) {
        return;
    }

    try {

        const resourceRef =
            doc(
                resourcesCollection
            );

        const submissionRef =
            doc(
                db,
                "communitySubmissions",
                submission.id
            );

        const batch =
            writeBatch(
                db
            );

        batch.set(
            resourceRef,
            {
                section:
                    "communities",
                active:
                    true,
                order:
                    nextOrder(
                        "communities"
                    ),
                title:
                    String(
                        submission.communityName ||
                        ""
                    ).trim(),
                description:
                    String(
                        submission.description ||
                        ""
                    ).trim() ||
                    `Pokémon GO community serving ${String(submission.area || "the local area").trim()}.`,
                url,
                platform:
                    submission.platform ||
                    inferCommunityPlatform(
                        url
                    ) ||
                    "Community",
                area:
                    String(
                        submission.area ||
                        ""
                    ).trim(),
                internalName:
                    "",
                altText:
                    "",
                imagePath:
                    "",
                imageUrl:
                    "",
                githubSha:
                    "",
                originalFileName:
                    "",
                createdAt:
                    serverTimestamp(),
                updatedAt:
                    serverTimestamp()
            }
        );

        batch.delete(
            submissionRef
        );

        await batch.commit();

        await Promise.all([
            loadResources(),
            loadCommunitySubmissions()
        ]);

    } catch (error) {

        console.error(
            "Unable to approve community submission:",
            error
        );

        alert(
            error.message ||
            "Unable to approve the community link."
        );
    }
}

async function rejectCommunitySubmission(
    submission
) {

    const confirmed =
        confirm(
            `Reject “${submission.communityName || "this community"}”?`
        );

    if (!confirmed) {
        return;
    }

    try {

        await deleteDoc(
            doc(
                db,
                "communitySubmissions",
                submission.id
            )
        );

        await loadCommunitySubmissions();

    } catch (error) {

        console.error(
            "Unable to reject community submission:",
            error
        );

        alert(
            "Unable to reject the community link."
        );
    }
}

export async function initResourcesManager() {
    const manager = getElement("resources-manager");
    if (!manager) return;

    ensureCommunityAdminUi();

    getElement("resource-admin-section")
        ?.addEventListener("change", () => {
            clearEditor({ keepSection: true });
        });

    getElement("saveResource")
        ?.addEventListener("click", saveResource);

    getElement("clearResource")
        ?.addEventListener("click", () => {
            clearEditor({ keepSection: true });
        });

    clearEditor({ keepSection: true });

    try {
        await Promise.all([
            loadResources(),
            loadCommunitySubmissions()
        ]);
    } catch (error) {
        console.error("Unable to load resources:", error);
        const list = getElement("resource-admin-list");
        const count = getElement("resource-admin-count");
        if (list) {
            list.textContent = "Unable to load resources.";
        }
        if (count) {
            count.textContent = "Unable to load resource totals.";
        }
    }
}
