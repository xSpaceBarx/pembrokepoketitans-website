import { app } from "./firebase.js";

import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";


const WORKER_URL =
    "https://poketitan-notifications.xspacebarx.workers.dev/";


const auth = getAuth(app);

const provider =
    new GoogleAuthProvider();


const overlay =
    document.getElementById("admin-auth-overlay");

const loginButton =
    document.getElementById("admin-google-login");

const authMessage =
    document.getElementById("admin-auth-message");


async function checkAdmin(user) {

    const token =
        await user.getIdToken();

    const response =
        await fetch(
            WORKER_URL,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },

                body: JSON.stringify({
                    action: "authCheck"
                })
            }
        );


    const result =
        await response.json();


    return (
        response.ok &&
        result.success === true &&
        result.authorized === true
    );
}


async function openAdmin(user) {

    try {

        authMessage.textContent =
            "Verifying administrator access...";


        const authorized =
            await checkAdmin(user);


        if (!authorized) {

            authMessage.textContent =
                "This Google account does not have administrator access.";

            await signOut(auth);

            loginButton.style.display =
                "inline-block";

            return;

        }


        /*
         * Hide login screen.
         */
        overlay.style.display =
            "none";


        /*
         * Only load the Admin JavaScript
         * AFTER authorization succeeds.
         */
        await import(
            "./admin.js?v=18"
        );


    } catch (error) {

        console.error(
            "Admin authorization error:",
            error
        );


        authMessage.textContent =
            "Unable to verify administrator access.";

        loginButton.style.display =
            "inline-block";

    }

}


await setPersistence(
    auth,
    browserLocalPersistence
);


loginButton.addEventListener(
    "click",
    async () => {

        try {

            authMessage.textContent =
                "Signing in...";


            await signInWithPopup(
                auth,
                provider
            );


        } catch (error) {

            console.error(
                "Google sign-in error:",
                error
            );


            authMessage.textContent =
                "Google sign-in was not completed.";

        }

    }
);


onAuthStateChanged(
    auth,
    async user => {

        if (user) {

            loginButton.style.display =
                "none";

            await openAdmin(user);

        } else {

            overlay.style.display =
                "flex";

            loginButton.style.display =
                "inline-block";

            authMessage.textContent =
                "Sign in with your authorized Google account.";

        }

    }
);
