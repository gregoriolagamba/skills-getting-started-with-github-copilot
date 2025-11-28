document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message and reset select
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = "";

      // add placeholder option
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "-- select an activity --";
      placeholder.disabled = true;
      placeholder.selected = true;
      activitySelect.appendChild(placeholder);

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown and attach participants list so we can do client-side checks
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        option.dataset.participants = JSON.stringify(details.participants || []);
        // mark full activities as disabled
        if (spotsLeft <= 0) {
          option.disabled = true;
          option.textContent = `${name} (full)`;
        }
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const activity = document.getElementById("activity").value;
    const submitButton = signupForm.querySelector('button[type="submit"]');

    // Client-side quick validation: check if select choice is valid
    if (!activity) {
      messageDiv.textContent = "Please choose an activity";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      return;
    }

    // Prevent immediate double clicks
    if (submitButton) submitButton.disabled = true;

    // Quick client-side duplicate check (best effort — server authoritative)
    const selectedOption = activitySelect.querySelector(`option[value="${CSS.escape(activity)}"]`);
    if (selectedOption) {
      const participants = JSON.parse(selectedOption.dataset.participants || "[]");
      if (participants.includes(email)) {
        messageDiv.textContent = "You are already registered for this activity";
        messageDiv.className = "error";
        messageDiv.classList.remove("hidden");
        if (submitButton) submitButton.disabled = false;
        return;
      }
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities so we show updated availability and prevent duplicate options
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
