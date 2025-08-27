// login form
document.getElementById("google-login")?.addEventListener("click", function () {
  window.location.href = "/auth/google";
});

// theme
document.addEventListener("DOMContentLoaded", function () {
  const themeToggle = document.getElementById("themeToggle");
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-mode");
    themeToggle.checked = true;
  } else {
    document.body.classList.add("light-mode");
    themeToggle.checked = false;
  }
  themeToggle.addEventListener("change", function () {
    if (themeToggle.checked) {
      document.body.classList.remove("light-mode");
      document.body.classList.add("dark-mode");
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.remove("dark-mode");
      document.body.classList.add("light-mode");
      localStorage.setItem("theme", "light");
    }
  });
});

function handler(id) {
  // Hide review text
  document.querySelector(".review-text").style.display = "none";

  // Toggle visibility for review elements
  document.getElementById("review" + id).hidden = true;
  ["text", "isbn", "genre", "title", "author", "rating", "button"].forEach(
    (key) => {
      document.getElementById(key + id).hidden = false;
    }
  );

  // Show labels and fieldset
  document.querySelectorAll("label").forEach((label) => (label.hidden = false));
  document.getElementById("fieldset").hidden = false;
}

// Highlight stars based on rating
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".rating").forEach((container) => {
    const rating = Number(container.dataset.rating) || 0;
    container.querySelectorAll(".star").forEach((star, index) => {
      if (index < rating) star.style.color = "#d15813";
    });
  });
});

function submitForm() {
  const genreSelect = document.getElementById("genreFilter");
  const sortSelect = document.getElementById("sort-select");

  if (sortSelect.value) {
    document.getElementById("sort-form").submit();
  }
  if (genreSelect.value) {
    document.getElementById("genreForm").submit();
  }
}

function searchCheck(event) {
  const searchValue = document.getElementById("searchInput").value.trim();

  if (searchValue === "") {
    document.getElementById("searchInput").style.border = "2px solid red";
    event.preventDefault(); // Prevent the form from submitting
    return false;
  }
  return true;
}

// Wait for the DOM to fully load before adding event listeners
document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("searchForm");

    // Add the submit event listener to the form
    form.addEventListener("submit", function (event) {
        return searchCheck(event); // Pass the event to the searchCheck function
    });
});

// to show file name
document.getElementById("bookImage").addEventListener("change", function () {
  const fileName = this.files[0] ? this.files[0].name : "No file chosen";
  document.getElementById("fileName").textContent = fileName;
});
