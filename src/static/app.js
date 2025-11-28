document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageBox = document.getElementById("message");

  // Helper: create element with attrs
  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else if (k === "html") node.innerHTML = v;
      else node.setAttribute(k, v);
    });
    children.forEach((c) => node.appendChild(c));
    return node;
  }

  // Helper: stable DOM id for an activity card (avoid CSS.escape id mismatches)
  function activityCardId(name) {
    // encodeURIComponent produces a safe id for use in getElementById
    return `card-${encodeURIComponent(name)}`;
  }

  // Create avatar initials from email
  function initialsFromEmail(email) {
    if (!email) return "?";
    const name = email.split("@")[0].replace(/[._\d]+/g, " ").trim();
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return email.slice(0, 2).toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  function showMessage(text, type = "info") {
    messageBox.className = `message ${type}`;
    messageBox.textContent = text;
    messageBox.classList.remove("hidden");
    setTimeout(() => {
      messageBox.classList.add("hidden");
    }, 4000);
  }

  // Render a single activity card with participants list
  function renderActivityCard(name, data) {
    const card = el("div", { class: "activity-card", id: activityCardId(name) });

    const title = el("h4", { text: name });
    const desc = el("p", { text: data.description });
    const schedule = el("p", { text: `Schedule: ${data.schedule}` });

    // participants section
    const participantsSection = el("div", { class: "participants-section" });
    const headerRow = el("div", { class: "participants-header" });
    headerRow.appendChild(el("strong", { text: "Participants" }));
    headerRow.appendChild(el("span", { class: "participants-count", text: `${data.participants.length}` }));

    participantsSection.appendChild(headerRow);

    if (!data.participants || data.participants.length === 0) {
      participantsSection.appendChild(el("div", { class: "participants-empty", text: "No participants yet — be the first!" }));
    } else {
      const list = el("ul", { class: "participants-list" });
      data.participants.forEach((email) => {
        const li = el("li", { class: "participant-item", "data-email": email });
        const avatar = el("div", { class: "avatar", text: initialsFromEmail(email) });
        const meta = el("div", { class: "participant-meta" });
        meta.appendChild(el("div", { class: "participant-email", text: email }));
        meta.appendChild(el("div", { class: "participant-extra", text: `Joined` }));
        li.appendChild(avatar);
        li.appendChild(meta);
        // delete button
        const del = el("button", { class: "participant-delete", title: `Unregister ${email}`, "aria-label": `Unregister ${email}` , type: "button", text: "✖"});
        del.addEventListener("click", async (ev) => {
          ev.preventDefault();
          try {
            const url = `/activities/${encodeURIComponent(name)}/participants?email=${encodeURIComponent(email)}`;
            const res = await fetch(url, { method: "DELETE" });
            const result = await res.json();
            if (!res.ok) throw new Error(result.detail || "Unregister failed");
            // remove from UI
            li.remove();
            const countEl = participantsSection.querySelector(".participants-count");
            if (countEl) {
              const newCount = Math.max(0, Number(countEl.textContent || 0) - 1);
              countEl.textContent = String(newCount);
              // if no participants left, replace with empty placeholder
              if (newCount === 0) {
                list.remove();
                participantsSection.appendChild(el("div", { class: "participants-empty", text: "No participants yet — be the first!" }));
              }
            }
            // optionally show feedback
            showMessage(result.message || `Unregistered ${email}`, "info");
          } catch (err) {
            showMessage(err.message || "Could not unregister", "error");
            console.error(err);
          }
        });
        li.appendChild(del);
        list.appendChild(li);
      });
      participantsSection.appendChild(list);
    }

    // Compose card
    card.appendChild(title);
    card.appendChild(desc);
    card.appendChild(schedule);
    card.appendChild(participantsSection);

    return card;
  }

  // Refresh activities list & select
  async function loadActivities() {
    activitiesList.innerHTML = ""; // clear
    activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';
    try {
      const res = await fetch("/activities");
      if (!res.ok) throw new Error("Failed to load activities");
      const activities = await res.json();
      // Order activities alphabetically for select
      const names = Object.keys(activities).sort((a, b) => a.localeCompare(b));
      names.forEach((name) => {
        const card = renderActivityCard(name, activities[name]);
        activitiesList.appendChild(card);
        // add to select
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        activitySelect.appendChild(opt);
      });
    } catch (err) {
      activitiesList.innerHTML = '<p class="error">Could not load activities</p>';
      console.error(err);
    }
  }

  // Update participants UI for one activity (append participant)
  function appendParticipantToCard(activityName, email) {
    const card = document.getElementById(activityCardId(activityName));
    // return false if the card isn't present so callers can refresh the list
    if (!card) return false;
    if (!card) return;
    const section = card.querySelector(".participants-section");
    // remove empty message if present
    const empty = section.querySelector(".participants-empty");
    if (empty) empty.remove();

    let list = section.querySelector(".participants-list");
    if (!list) {
      list = document.createElement("ul");
      list.className = "participants-list";
      section.appendChild(list);
    }

    const li = document.createElement("li");
    li.className = "participant-item";
    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = initialsFromEmail(email);
    const meta = document.createElement("div");
    meta.className = "participant-meta";
    const emailDiv = document.createElement("div");
    emailDiv.className = "participant-email";
    emailDiv.textContent = email;
    const extra = document.createElement("div");
    extra.className = "participant-extra";
    extra.textContent = "Joined";
    meta.appendChild(emailDiv);
    meta.appendChild(extra);
    li.appendChild(avatar);
    li.appendChild(meta);
    const del = document.createElement("button");
    del.className = "participant-delete";
    del.type = "button";
    del.title = `Unregister ${email}`;
    del.setAttribute("aria-label", `Unregister ${email}`);
    del.textContent = "✖";
    del.addEventListener("click", async (ev) => {
      ev.preventDefault();
      try {
        const url = `/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(email)}`;
        const res = await fetch(url, { method: "DELETE" });
        const result = await res.json();
        if (!res.ok) throw new Error(result.detail || "Unregister failed");
        // remove from UI
        li.remove();
        const section = card.querySelector(".participants-section");
        const countEl = section ? section.querySelector(".participants-count") : null;
        if (countEl) {
          const newCount = Math.max(0, Number(countEl.textContent || 0) - 1);
          countEl.textContent = String(newCount);
          if (newCount === 0 && section) {
            const listEl = section.querySelector(".participants-list");
            if (listEl) listEl.remove();
            section.appendChild(el("div", { class: "participants-empty", text: "No participants yet — be the first!" }));
          }
        }
        showMessage(result.message || `Unregistered ${email}`, "info");
      } catch (err) {
        showMessage(err.message || "Could not unregister", "error");
        console.error(err);
      }
    });
    li.appendChild(del);
    list.appendChild(li);

    // update count
    const countEl = section.querySelector(".participants-count");
    if (countEl) countEl.textContent = String(Number(countEl.textContent || 0) + 1);

    return true;
  }

  // Sign up handler
  signupForm.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const emailInput = document.getElementById("email");
    const selected = activitySelect.value;
    const email = emailInput.value.trim();
    if (!selected || !email) {
      showMessage("Please select an activity and provide an email.", "error");
      return;
    }
    try {
      const url = `/activities/${encodeURIComponent(selected)}/signup?email=${encodeURIComponent(email)}`;
      const res = await fetch(url, { method: "POST" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.detail || "Signup failed");
      // UI update: if the card isn't in the DOM (for example different view), reload activities
      const updated = appendParticipantToCard(selected, email);
      if (!updated) await loadActivities();
      showMessage(`Signed up ${email} for ${selected}`, "success");
      emailInput.value = "";
    } catch (err) {
      const text = err.message || "Signup error";
      showMessage(text, "error");
      console.error(err);
    }
  });

  // initial load
  loadActivities();
});
