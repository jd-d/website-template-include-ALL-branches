export function renderPathwayList(container, pathways, selectedId, onSelect) {
  if (!(container instanceof HTMLElement)) {
    return;
  }

  container.innerHTML = '';

  if (!Array.isArray(pathways) || pathways.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'No rule packs available. Check the repository configuration.';
    container.appendChild(empty);
    return;
  }

  pathways.forEach((pack) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pathway-card';
    button.setAttribute('role', 'listitem');
    button.dataset.packId = pack.id;

    if (pack.id === selectedId) {
      button.classList.add('is-active');
    }

    const header = document.createElement('div');
    header.className = 'pathway-card__header';

    const title = document.createElement('h3');
    title.className = 'pathway-card__title';
    title.textContent = pack.title;
    header.appendChild(title);

    const meta = document.createElement('div');
    meta.className = 'pathway-card__meta';
    const version = document.createElement('span');
    version.textContent = `v${pack.version}`;
    const effective = document.createElement('span');
    effective.textContent = pack.effective;
    const pathway = document.createElement('span');
    pathway.textContent = pack.pathway;
    meta.append(version, effective, pathway);
    header.appendChild(meta);

    const summary = document.createElement('p');
    summary.className = 'pathway-card__summary';
    summary.textContent = pack.summary || 'Deterministic rule pack.';

    button.append(header, summary);
    button.addEventListener('click', () => {
      if (typeof onSelect === 'function') {
        onSelect(pack);
      }
    });

    container.appendChild(button);
  });
}
