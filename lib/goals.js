// Sugestão de meta pra próxima vez, com base no último desempenho do exercício.
// Regra simples e conservadora (progressão de carga/repetição):
//  - Não fechou todas as séries  -> repetir (consolidar)
//  - Fechou tudo e achou fácil   -> subir carga (~+2.5kg) ou +2 reps
//  - Fechou tudo e foi "ok"      -> tentar +1 rep antes de subir carga
//  - Foi no limite               -> manter e buscar controle

function round(w) {
  // arredonda pro incremento de 0,5kg (halteres em casa costumam ir de 0,5/1kg)
  return Math.round(w * 2) / 2;
}

function firstNum(str) {
  const m = String(str ?? '').replace(',', '.').match(/\d+(\.\d+)?/);
  return m ? Number(m[0]) : 0;
}

export function suggestForEntry(entry) {
  const target = firstNum(entry.targetReps);
  const sets = entry.targetSets || entry.sets.length;
  const doneSets = entry.sets.filter((s) => s.done);
  const weights = doneSets.map((s) => Number(s.weight)).filter((w) => !isNaN(w) && w > 0);
  const baseW = weights.length ? Math.max(...weights) : null;
  const allDone = entry.sets.length > 0 && entry.sets.every((s) => s.done);
  const hitReps = doneSets.length > 0 && doneSets.every((s) => (Number(s.reps) || 0) >= target);
  const feeling = entry.feeling;

  if (!allDone) {
    return {
      action: 'manter',
      weight: baseW,
      reps: target,
      text: `Você não fechou todas as séries. Repita ${sets}x${target}${baseW ? ` com ${baseW}kg` : ''} até completar limpo.`,
    };
  }

  if (feeling === 'facil' && hitReps) {
    if (baseW) {
      const nw = round(Math.max(baseW + 2.5, baseW * 1.05));
      const inc = round(nw - baseW);
      return {
        action: 'subir_peso',
        weight: nw,
        reps: target,
        text: `Foi tranquilo — suba +${inc}kg (de ${baseW} → ${nw}kg), mantendo ${sets}x${target}.`,
      };
    }
    return {
      action: 'subir_reps',
      weight: null,
      reps: target + 2,
      text: `Foi tranquilo — aumente pra ${sets}x${target + 2}.`,
    };
  }

  if (feeling === 'ok' && hitReps) {
    return {
      action: 'subir_reps',
      weight: baseW,
      reps: target + 1,
      text: `Bom — tente ${sets}x${target + 1}${baseW ? ` com ${baseW}kg` : ''} antes de subir a carga.`,
    };
  }

  return {
    action: 'manter',
    weight: baseW,
    reps: target,
    text: `Foi no limite — repita ${sets}x${target}${baseW ? ` com ${baseW}kg` : ''} e busque mais controle.`,
  };
}
