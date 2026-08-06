import { db } from "./firebase.js";

import {
    collection,
    addDoc,
    doc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

export async function saveNotification(notification,id){

    try{

        if(id){

            await updateDoc(
                doc(db,"notifications",id),
                {

                    ...notification,

                    updated:serverTimestamp()

                }
            );

            alert("✅ Draft Updated");

        }

        else{

            await addDoc(
                collection(db,"notifications"),
                {

                    ...notification,

                    status:"draft",

                    created:serverTimestamp()

                }
            );

            alert("✅ Draft Saved");

        }

    }

    catch(err){

        console.error(err);

        alert("Unable to save draft.");

    }

}
