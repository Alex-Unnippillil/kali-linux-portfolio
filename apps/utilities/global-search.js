const tools = [
  { id: 'calculator', name: 'Calculator', url: '../calculator/index.html' },
  { id: 'color-picker', name: 'Color Picker', url: '../color_picker/index.html' }
];

const searchInput = document.getElementById('search');
const list = document.getElementById('tools');

function render(filter = '') {
  list.innerHTML = '';
  const term = filter.toLowerCase();
  tools
    .filter((t) => t.name.toLowerCase().includes(term))
    .forEach((tool) => {
      const li = document.createElement('li');
      const button = document.createElement('button');
      button.textContent = tool.name;
      button.addEventListener('click', () => openModal(tool.url, tool.name));
      li.appendChild(button);
      list.appendChild(li);
    });
}

searchInput.addEventListener('input', () => render(searchInput.value));
render();
