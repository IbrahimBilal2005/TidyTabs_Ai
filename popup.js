// === Backend endpoint for categorization ===
import { BACKEND_URL } from "./config.js";

// === UI Status Message Helper ===
function setStatus(message, isLoading = false) {
  const statusDiv = document.getElementById("status");
  statusDiv.textContent = message;
  statusDiv.className = isLoading ? "loading" : "";
}

// === Main button click handler ===
document.getElementById("organizeButton").addEventListener("click", async () => {
  setStatus("Scanning tabs");

  // Get all tabs from the current Chrome window
  chrome.tabs.query({ currentWindow: true }, async (tabs) => {
    const titles = tabs.map(tab => tab.title);
    setStatus("Organizing tabs", true);

    try {
      const response = await fetch(`${BACKEND_URL}/categorize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titles }),  // Convert JS object to JSON string
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Server error:", response.status, errorText);
        setStatus("❌ Server error. Check console.");
        return;
      }

      const data = await response.json();

      let parsed;
      try {
        // data.categories is already a JSON object (not a string)
        parsed = data.categories;
      } catch (e) {
        console.error("❌ Failed to read GPT response:", data.categories);
        setStatus("❌ GPT returned invalid format. Try again.");
        return;
      }

      // Group the browser tabs based on GPT's parsed result
      await organizeTabs(tabs, parsed);
      setStatus("✅ Tabs organized successfully!");
    } catch (err) {
      console.error(err);
      setStatus("❌ Failed to organize tabs.");
    }
  });
});

// === Group the browser tabs using GPT categories ===
async function organizeTabs(tabs, groups) {
  for (const [groupName, titles] of Object.entries(groups)) {
    const tabIds = tabs
      .filter(tab => titles.includes(tab.title))
      .map(tab => tab.id);

    // Group them and assign color/title
    if (tabIds.length > 0) {
      const groupId = await chrome.tabs.group({ tabIds });
      await chrome.tabGroups.update(groupId, {
        title: groupName,
        color: getGroupColor(groupName),
        collapsed: true // Start collapsed for a cleaner view
      });
    }
  }
}

// === Assign consistent colors to categories ===
function getGroupColor(name) {
  const colors = ["blue", "red", "yellow", "green", "pink", "purple", "cyan", "orange"];
  let hash = 0;

  // Generate a deterministic hash based on group name
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Map hash to one of the predefined colors
  return colors[Math.abs(hash) % colors.length];
}
