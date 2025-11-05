export function renderDocumentation(container, documentation, pack, evaluation) {
  if (!(container instanceof HTMLElement)) {
    return;
  }

  container.innerHTML = '';
  container.classList.add('documentation-output');

  if (!documentation || !pack) {
    const message = document.createElement('p');
    message.className = 'muted';
    message.textContent = 'Complete the intake to generate documentation output.';
    container.appendChild(message);
    return;
  }

  const summary = document.createElement('p');
  summary.textContent = documentation.summary || 'Documentation ready.';
  container.appendChild(summary);

  const sections = Array.isArray(documentation.sections) ? documentation.sections : [];
  sections.forEach((section) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'result-section';
    if (section.title) {
      const heading = document.createElement('h3');
      heading.textContent = section.title;
      wrapper.appendChild(heading);
    }
    const lines = Array.isArray(section.lines) ? section.lines : [];
    lines.forEach((line) => {
      const paragraph = document.createElement('p');
      paragraph.textContent = line;
      wrapper.appendChild(paragraph);
    });
    container.appendChild(wrapper);
  });

  if (documentation.markdown) {
    const pre = document.createElement('pre');
    pre.textContent = documentation.markdown;
    container.appendChild(pre);
  }

  if (Array.isArray(documentation.safetyNetting) && documentation.safetyNetting.length > 0) {
    const safetyWrapper = document.createElement('div');
    safetyWrapper.className = 'result-section';
    const heading = document.createElement('h3');
    heading.textContent = 'Safety netting';
    safetyWrapper.appendChild(heading);
    const list = document.createElement('ul');
    list.className = 'result-list';
    documentation.safetyNetting.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      list.appendChild(li);
    });
    safetyWrapper.appendChild(list);
    container.appendChild(safetyWrapper);
  }
}
