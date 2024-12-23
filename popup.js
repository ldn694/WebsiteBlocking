// Load blocklist and display it
chrome.storage.local.get(["blocklist"], (result) => {
    const blocklist = result.blocklist || [];
    const ul = document.querySelector("#blocklist ul");
    ul.innerHTML = "";
    blocklist.forEach((site) => {
        const li = document.createElement("li");
        li.textContent = site;
        ul.appendChild(li);
    });
});

// Function to update the blocklist UI
function updateBlocklistUI(blocklist) {
    const ul = document.querySelector("#blocklist ul");
    ul.innerHTML = "";
    blocklist.forEach((site) => {
        const li = document.createElement("li");
        li.textContent = site;
        ul.appendChild(li);
    });
}

// Load blocklist and display it when the popup is opened
chrome.storage.local.get(["blocklist"], (result) => {
    const blocklist = result.blocklist || [];
    updateBlocklistUI(blocklist);
});

// Listen for changes in the blocklist and update the UI dynamically
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "local" && changes.blocklist) {
        const updatedBlocklist = changes.blocklist.newValue || [];
        updateBlocklistUI(updatedBlocklist);
        console.log("Blocklist updated in popup:", updatedBlocklist);
    }
});
