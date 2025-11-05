import { joinNatural } from '../utils.js';

export function renderResults(container, pack, evaluation) {
  if (!(container instanceof HTMLElement)) {
    return;
  }

  container.innerHTML = '';

  if (!pack) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'Select a rule pack to view decision support output.';
    container.appendChild(empty);
    return;
  }

  const summary = document.createElement('div');
  summary.className = 'result-summary';

  const badge = createStatusBadge(evaluation.status);
  summary.appendChild(badge);

  const title = document.createElement('h3');
  title.textContent = pack.metadata?.title || pack.title;
  summary.appendChild(title);

  const meta = document.createElement('p');
  meta.className = 'muted';
  const version = pack.metadata?.version ? `v${pack.metadata.version}` : 'unversioned';
  const effective = pack.metadata?.effective || 'unknown effective date';
  const pathway = pack.metadata?.pathway || pack.pathway || 'Pathway';
  meta.textContent = `${pathway} · ${version} · effective ${effective}`;
  summary.appendChild(meta);

  if (evaluation.decisionSummary) {
    const decision = document.createElement('p');
    decision.textContent = evaluation.decisionSummary;
    summary.appendChild(decision);
  }

  container.appendChild(summary);

  if (Array.isArray(evaluation.clarifierDetails) && evaluation.clarifierDetails.length > 0) {
    const clarifierSection = document.createElement('div');
    clarifierSection.className = 'result-section';
    const heading = document.createElement('h3');
    heading.textContent = 'Clarify before continuing';
    clarifierSection.appendChild(heading);
    const clarifierList = document.createElement('div');
    clarifierList.className = 'clarifier-chips';
    evaluation.clarifierDetails.forEach((item) => {
      const chip = document.createElement('span');
      chip.className = 'clarifier-chip';
      const hint = item.clarifier ? ` – ${item.clarifier}` : '';
      chip.textContent = `${item.label}${hint}`;
      clarifierList.appendChild(chip);
    });
    clarifierSection.appendChild(clarifierList);
    container.appendChild(clarifierSection);
  }

  if (Array.isArray(evaluation.referrals) && evaluation.referrals.length > 0) {
    const referralSection = document.createElement('div');
    referralSection.className = 'result-section';
    const heading = document.createElement('h3');
    heading.textContent = 'Referral actions';
    referralSection.appendChild(heading);
    const list = document.createElement('ul');
    list.className = 'result-list';
    evaluation.referrals.forEach((ref) => {
      const item = document.createElement('li');
      const reason = ref.reason || 'Refer according to protocol.';
      const urgency = ref.urgency ? ` (${ref.urgency.replace(/_/g, ' ')})` : '';
      item.textContent = `${reason}${urgency}`;
      list.appendChild(item);
    });
    referralSection.appendChild(list);
    container.appendChild(referralSection);
  }

  if (evaluation.supply) {
    const supplySection = document.createElement('div');
    supplySection.className = 'result-section';
    const heading = document.createElement('h3');
    heading.textContent = 'Supply recommendation';
    supplySection.appendChild(heading);

    const summaryLine = document.createElement('p');
    summaryLine.innerHTML = `<strong>${evaluation.supply.product}</strong> · ${evaluation.supply.quantity || ''}`;
    supplySection.appendChild(summaryLine);

    if (evaluation.supply.directions) {
      const directions = document.createElement('p');
      directions.textContent = evaluation.supply.directions;
      supplySection.appendChild(directions);
    }

    if (Array.isArray(evaluation.supply.counselling) && evaluation.supply.counselling.length > 0) {
      const adviceHeading = document.createElement('p');
      adviceHeading.className = 'muted';
      adviceHeading.textContent = 'Counselling points:';
      supplySection.appendChild(adviceHeading);
      const counsellingList = document.createElement('ul');
      counsellingList.className = 'result-list';
      evaluation.supply.counselling.forEach((line) => {
        const item = document.createElement('li');
        item.textContent = line;
        counsellingList.appendChild(item);
      });
      supplySection.appendChild(counsellingList);
    }

    if (Array.isArray(evaluation.alternateSupplies) && evaluation.alternateSupplies.length > 0) {
      const alt = document.createElement('p');
      alt.className = 'muted';
      const altProducts = evaluation.alternateSupplies.map((item) => item.product).filter(Boolean);
      alt.textContent = `Alternate supply options also matched: ${joinNatural(altProducts)}.`;
      supplySection.appendChild(alt);
    }

    container.appendChild(supplySection);
  }

  if (Array.isArray(evaluation.advice) && evaluation.advice.length > 0) {
    const adviceSection = document.createElement('div');
    adviceSection.className = 'result-section';
    const heading = document.createElement('h3');
    heading.textContent = evaluation.status === 'advice' ? 'Recommended self-care' : 'Additional advice';
    adviceSection.appendChild(heading);
    evaluation.advice.forEach((block) => {
      if (Array.isArray(block.advice)) {
        const list = document.createElement('ul');
        list.className = 'result-list';
        block.advice.forEach((line) => {
          const item = document.createElement('li');
          item.textContent = line;
          list.appendChild(item);
        });
        adviceSection.appendChild(list);
      }
    });
    container.appendChild(adviceSection);
  }

  renderTrace(container, evaluation.trace);
  renderSafetyNetting(container, evaluation.safetyNetting);
  renderAudit(container, evaluation);
}

function createStatusBadge(status) {
  const badge = document.createElement('span');
  badge.className = 'status-badge';
  switch (status) {
    case 'supply':
      badge.classList.add('status-badge--ok');
      badge.textContent = 'Suitable for supply';
      break;
    case 'refer':
      badge.classList.add('status-badge--refer');
      badge.textContent = 'Referral required';
      break;
    case 'needs_clarification':
      badge.classList.add('status-badge--clarify');
      badge.textContent = 'Clarification needed';
      break;
    case 'advice':
      badge.classList.add('status-badge--ok');
      badge.textContent = 'Provide self-care';
      break;
    default:
      badge.textContent = 'Awaiting input';
      break;
  }
  return badge;
}

function renderTrace(container, trace) {
  if (!trace || (!Array.isArray(trace.gates) && !Array.isArray(trace.recommendations))) {
    return;
  }

  const traceSection = document.createElement('div');
  traceSection.className = 'result-section';
  const heading = document.createElement('h3');
  heading.textContent = 'Decision trace';
  traceSection.appendChild(heading);

  const list = document.createElement('div');
  list.className = 'trace-list';

  if (Array.isArray(trace.gates)) {
    trace.gates.forEach((gate) => {
      const item = document.createElement('div');
      item.className = 'trace-item';
      const status = document.createElement('span');
      status.className = 'trace-item__status';
      status.textContent = gate.triggered ? 'Triggered referral gate' : 'Passed gate';
      status.classList.add(gate.triggered ? 'is-fail' : 'is-pass');
      item.appendChild(status);
      const description = document.createElement('p');
      description.textContent = gate.description || gate.id;
      item.appendChild(description);
      if (gate.triggered && gate.outcome?.reason) {
        const reason = document.createElement('p');
        reason.className = 'muted';
        reason.textContent = gate.outcome.reason;
        item.appendChild(reason);
      }
      list.appendChild(item);
    });
  }

  if (Array.isArray(trace.recommendations)) {
    trace.recommendations.forEach((rule) => {
      const item = document.createElement('div');
      item.className = 'trace-item';
      const status = document.createElement('span');
      status.className = 'trace-item__status';
      status.textContent = rule.matched ? 'Matched recommendation' : 'Not matched';
      status.classList.add(rule.matched ? 'is-pass' : 'is-fail');
      item.appendChild(status);
      const description = document.createElement('p');
      description.textContent = rule.title || rule.id;
      item.appendChild(description);
      if (rule.matched && rule.outcome?.type) {
        const outcome = document.createElement('p');
        outcome.className = 'muted';
        outcome.textContent = `Outcome: ${rule.outcome.type}`;
        item.appendChild(outcome);
      }
      list.appendChild(item);
    });
  }

  traceSection.appendChild(list);
  container.appendChild(traceSection);
}

function renderSafetyNetting(container, safetyNetting) {
  if (!Array.isArray(safetyNetting) || safetyNetting.length === 0) {
    return;
  }
  const section = document.createElement('div');
  section.className = 'result-section';
  const heading = document.createElement('h3');
  heading.textContent = 'Safety netting';
  section.appendChild(heading);
  const list = document.createElement('ul');
  list.className = 'result-list';
  safetyNetting.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    list.appendChild(li);
  });
  section.appendChild(list);
  container.appendChild(section);
}

function renderAudit(container, evaluation) {
  const section = document.createElement('div');
  section.className = 'result-section';
  const heading = document.createElement('h3');
  heading.textContent = 'Audit payload';
  section.appendChild(heading);
  const pre = document.createElement('pre');
  pre.className = 'audit-json';
  const payload = {
    pack: evaluation.packMetadata,
    derived: evaluation.derived,
    status: evaluation.status,
    decisionSummary: evaluation.decisionSummary,
    referrals: evaluation.referrals,
    supply: evaluation.supply,
    advice: evaluation.advice,
    evaluatedAt: evaluation.evaluatedAt
  };
  pre.textContent = JSON.stringify(payload, null, 2);
  section.appendChild(pre);
  container.appendChild(section);
}
