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
    }
};

const resourcesCollection =
    collection(db, "resources");

let allResources = [];
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

export async function initResourcesManager() {
    const manager = getElement("resources-manager");
    if (!manager) return;

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
        await loadResources();
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
