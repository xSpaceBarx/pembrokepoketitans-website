import { loadDraft } from "./editDraft.js";

export async function duplicateDraft(id){

    await loadDraft(id);

    document.getElementById("notification-id").value = "";

    document.getElementById("editingBanner").style.display = "none";

    document.getElementById("sendNotification").innerHTML =
        "💾 Save Draft";

    const title =
        document.getElementById("notification-title");

    if (!title.value.includes("(Copy)")){

        title.value += " (Copy)";

    }

}
