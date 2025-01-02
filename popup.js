async function getAuthToken() {
    return new Promise((resolve) => {
        chrome.storage.local.get(["auth_token"], (result) => {
            resolve(result.auth_token || "");
        });
    });
}
async function getBlocklist() {
    return new Promise((resolve) => {
        chrome.storage.local.get(["blocklist"], (result) => {
            resolve(result.blocklist || []);
        });
    });
}
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM fully loaded and parsed');
    const signInScreen = document.getElementById('signInScreen');
    const blockedScreen = document.getElementById('blockedScreen');
    const signInButton = document.getElementById('signInButton');
    const errorMessage = document.getElementById('errorMessage');
    const blockList = document.getElementById('blockList');
    const signOutButton = document.getElementById('signOutButton');

    // Check for auth_token
    const authToken = await getAuthToken();
    if (authToken) {
        console.log('User is signed in');
        displayBlockedScreen();
    } else {
        console.log('User is not signed in');
        displaySignInScreen();
    }

    // Show sign-in screen
    function displaySignInScreen() {
        signInScreen.classList.add('active');
        blockedScreen.classList.remove('active');
    }

    // Show blocked websites screen
    function displayBlockedScreen() {
        signInScreen.classList.remove('active');
        blockedScreen.classList.add('active');
        loadBlockList();
    }

    // Load block list
    async function loadBlockList() {
        const blocklist = await getBlocklist();
        console.log('Blocklist:', blocklist);
        blockList.innerHTML = blocklist.length
            ? blocklist.map(site => `<li>${site}</li>`).join('')
            : '<li>No blocked websites</li>';
    }

    // Handle sign-in button click
    signInButton.addEventListener('click', async () => {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        if (!email || !password) {
            errorMessage.textContent = 'Please fill out all fields.';
            return;
        }

        const data = {
            'email': email,
            'password': password
        };
        const response = await fetch('https://cs300-focustask.onrender.com/todolist/api/user/signin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (response.ok) {
            const data = await response.json();
            if (data.status === "success" && data.data && data.data.authenticationToken) {
                chrome.storage.local.set({ auth_token: data.data.authenticationToken }, () => {
                    if (chrome.runtime.lastError) {
                        console.error('Failed to save token:', chrome.runtime.lastError);
                    } else {
                        console.log('New token saved:', data.data.authenticationToken);
                    }
                });
                chrome.storage.local.get(["auth_token"], async (result) => {
                    console.log('Found newly saved token:', result.auth_token);
                });
                displayBlockedScreen();
            }
            else {
                console.error('Invalid API response:', data);
            }
        } else {
            errorMessage.textContent = 'Sign in failed. Please try again.';
        }

        // remove the password from the input field
        document.getElementById('password').value = "";
    });
    signOutButton.addEventListener('click', async () => {
        console.log('Signing out...');
        chrome.storage.local.remove('auth_token', () => {
            if (chrome.runtime.lastError) {
                console.error('Failed to remove token:', chrome.runtime.lastError);
            } else {
                console.log('Token removed');
                displaySignInScreen();
            }
        });
    });
    // Listen for changes to the blocklist in local storage
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.blocklist) {
            console.log('Blocklist updated:', changes.blocklist.newValue);
            loadBlockList(); // Reload the blocklist when it changes
        }
    });
});