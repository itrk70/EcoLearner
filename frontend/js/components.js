async function loadComponent(id, file) {
    const container = document.getElementById(id);
    if (!container) return;

    try {
        const response = await fetch(file);

        if (!response.ok) {
            throw new Error(`Cannot load ${file}`);
        }

        container.innerHTML = await response.text();
    } catch (err) {
        console.error(err);
    }
}
loadComponent("footer-container", "footer.html");
loadComponent("bottom-nav-container", "bottom-nav.html");
loadComponent("top-nav-container", "navbar.html");