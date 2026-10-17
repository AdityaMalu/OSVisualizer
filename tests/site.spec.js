import { test, expect } from '@playwright/test';

// Collect page errors and console errors so every test can assert a clean run.
let pageErrors = [];
test.beforeEach(async ({ page }) => {
  pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') pageErrors.push(m.text()); });
  await page.goto('index.html');
});
test.afterEach(() => expect(pageErrors, 'console/page errors').toEqual([]));

test('every step of every topic renders', async ({ page }) => {
  const bad = await page.evaluate(() => {
    const out = [];
    T.forEach((t, i) => t.R.forEach((_, s) => {
      try {
        go(i, s);
        const code = document.querySelectorAll('#code .ln').length;
        if (!code) out.push(`${t.no} step ${s + 1}: no code lines`);
        if (!document.getElementById('say').textContent.trim()) out.push(`${t.no} step ${s + 1}: empty narration`);
      } catch (e) { out.push(`${t.no} step ${s + 1}: ${e.message}`); }
    }));
    return out;
  });
  expect(bad).toEqual([]);
});

test('every topic has theory, examples, interview tips, exercises and a quiz', async ({ page }) => {
  const res = await page.evaluate(() => T.map((t, i) => {
    go(i, 0);
    const shown = id => !document.getElementById(id).hidden;
    return { no: t.no,
      theory: shown('theoryCard') && !!document.getElementById('theory').textContent.trim(),
      examples: shown('exCard') ? document.querySelectorAll('#examples .ex').length : 0,
      tips: shown('tipCard') && !!document.querySelector('#tips .tip-say'),
      exercises: shown('xrCard') ? document.querySelectorAll('#exercises .xr').length : 0,
      questions: document.querySelectorAll('#quiz .qz').length };
  }).filter(r => !r.theory || r.examples < 3 || !r.tips || r.exercises < 3 || r.questions !== 3));
  expect(res).toEqual([]);
});

test('a simulator example runs and shows a Gantt chart and table', async ({ page }) => {
  await page.goto('index.html#t3-4');
  await page.reload();
  const ex = page.locator('#examples .ex').first();
  await ex.locator('[data-run]').click();
  await expect(ex.locator('.res-box svg')).toBeVisible();
  await expect(ex.locator('.res-box table').first().locator('tbody tr')).toHaveCount(3);   // P1, P2, P3
  await expect(ex.locator('.sim-sum')).toContainText('5.67');                             // Galvin RR q=4 average waiting
});

test('an edited simulator input runs the edited input', async ({ page }) => {
  await page.goto('index.html#t7-2');
  await page.reload();
  const ex = page.locator('#examples .ex').first();
  await ex.locator('[data-edit]').click();
  await ex.locator('textarea').fill(['algo: OPT', 'frames: 3', 'refs: 7 0 1 2 0 3 0 4 2 3 0 3 2 1 2 0 1 7 0 1'].join('\n'));
  await ex.locator('[data-run]').click();
  await expect(ex.locator('.sim-sum')).toContainText('page faults');
  await expect(ex.locator('.sim-sum .row', { hasText: 'page faults' }).locator('.v')).toHaveText('9');
});

test('exercises are auto-checked: wrong answer explains, right answer passes and is remembered', async ({ page }) => {
  await page.goto('index.html#t3-1');
  await page.reload();
  const xr = page.locator('#exercises .xr').first();
  await xr.locator('.ans-in').fill('99');
  await xr.locator('[data-check]').click();
  await expect(xr.locator('.xr-status')).toHaveClass(/bad/);
  await xr.locator('.ans-in').fill('4.33');
  await xr.locator('[data-check]').click();
  await expect(xr.locator('.xr-status')).toHaveClass(/ok/);
  await expect(xr.locator('[data-done]')).toBeChecked();
  await expect(page.locator('#xrScore')).toHaveText(/^1 \/ \d+ done$/);
  await page.reload();
  await expect(page.locator('#exercises .xr').first().locator('[data-done]')).toBeChecked();
});

test('every simulator exercise has a computable answer shown in its solution', async ({ page }) => {
  const bad = await page.evaluate(() => {
    const out = [];
    T.forEach((t, i) => t.exercises.forEach((x, j) => {
      try { const a = expected(x); if (x.sim && (a === null || a === '' || a === 'undefined')) out.push(`${t.no} E${j + 1}`); }
      catch (e) { out.push(`${t.no} E${j + 1}: ${e.message}`); }
    }));
    return out;
  });
  expect(bad).toEqual([]);
});

test('a simulator input error is shown, not thrown', async ({ page }) => {
  await page.goto('index.html#t3-1');
  await page.reload();
  const ex = page.locator('#examples .ex').first();
  await ex.locator('[data-edit]').click();
  await ex.locator('textarea').fill(['algo: NOPE', 'P1 0 3'].join('\n'));
  await ex.locator('[data-run]').click();
  await expect(ex.locator('.res-err')).toBeVisible();
});

test('hints, solutions and follow-up answers are hidden until asked for', async ({ page }) => {
  const xr = page.locator('#exercises .xr').first();
  await expect(xr.locator('.xr-sol')).toBeHidden();
  await xr.locator('[data-sol]').click();
  await expect(xr.locator('.xr-sol')).toBeVisible();
  const qa = page.locator('#tips .tip-qa details').first();
  await expect(qa).not.toHaveAttribute('open', '');
  await qa.locator('summary').click();
  await expect(qa).toHaveAttribute('open', '');
});

test('step controls and keyboard navigation', async ({ page }) => {
  await expect(page.locator('#count')).toHaveText(/^Step 1 \/ \d+$/);
  await page.locator('#next').click();
  await expect(page.locator('#count')).toHaveText(/^Step 2 \//);
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#count')).toHaveText(/^Step 1 \//);
  const first = await page.locator('#no').textContent();
  await page.keyboard.press(']');
  await expect(page.locator('#no')).not.toHaveText(first);
});

test('deep link opens the topic named in the hash', async ({ page }) => {
  await page.goto('index.html#t5-3');
  await page.reload();                       // a hash-only change doesn't reload the page
  await expect(page.locator('#no')).toHaveText('5.3');
});

test('quiz draws different questions on each try, with correct answers', async ({ page }) => {
  const r = await page.evaluate(() => {
    const i = T.findIndex(t => t.no === '3.4'); go(i, 0);
    const t = T[i], bank = [...t.quiz, ...t.quizAdv];
    let overlap = 0, wrong = 0, prev = null;
    for (let k = 0; k < 20; k++) {
      renderQuiz();
      const cur = qlist.map(q => q[0]);
      if (prev) overlap += cur.filter(q => prev.includes(q)).length;
      qlist.forEach(q => { const src = bank.find(b => b[0] === q[0]); if (src[1][src[2]] !== q[1][q[2]]) wrong++; });
      prev = cur;
    }
    return { overlap, wrong, shown: document.querySelectorAll('#quiz .qz').length };
  });
  expect(r).toEqual({ overlap: 0, wrong: 0, shown: 3 });
});

test('answering a question reveals the explanation', async ({ page }) => {
  await page.locator('#quiz .qz').first().locator('.opts button').first().click();
  await expect(page.locator('#quiz .qz').first().locator('.why')).toBeVisible();
});

test('interview focus filter hides non-priority topics', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile', 'the topic rail is hidden on small screens');
  const all = await page.locator('#rail button').count();
  await page.locator('#focus button[data-focus="must"]').click();
  const must = await page.locator('#rail button').count();
  expect(must).toBeLessThan(all);
  await page.locator('#focus button[data-focus="all"]').click();
});

test('no horizontal scrolling on any topic', async ({ page }) => {
  const wide = await page.evaluate(() => T.filter((t, i) => {
    go(i, t.R.length - 1);
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  }).map(t => t.no));
  expect(wide).toEqual([]);
});

test.describe('topic sidebar', () => {
  test('collapses and expands on wide screens, and remembers it', async ({ page }, info) => {
    test.skip(info.project.name === 'mobile', 'wide-screen behaviour');
    const sidebar = page.locator('#sidebar'), toggle = page.locator('#railToggle');
    await expect(sidebar).toBeVisible();
    await expect(toggle).toBeHidden();
    await page.locator('#railClose').click();
    await expect(sidebar).toBeHidden();
    await expect(toggle).toBeVisible();
    await expect(toggle).toBeFocused();
    await page.reload();
    await expect(sidebar).toBeHidden();
    await toggle.click();
    await expect(sidebar).toBeVisible();
    await expect(toggle).toBeHidden();
  });

  test('resizes with the keyboard and remembers the width', async ({ page }, info) => {
    test.skip(info.project.name === 'mobile', 'wide-screen behaviour');
    const width = () => page.locator('#sidebar').evaluate(el => Math.round(el.getBoundingClientRect().width));
    expect(await width()).toBe(270);
    const step = await page.locator('#count').textContent();
    await page.locator('#railResize').focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    expect(await width()).toBe(310);
    await expect(page.locator('#count')).toHaveText(step);        // arrows resized, didn't step the walkthrough
    await page.keyboard.press('End');
    expect(await width()).toBe(480);
    await page.reload();
    expect(await width()).toBe(480);
    await page.locator('#railResize').dblclick();
    expect(await width()).toBe(270);
  });

  test('resizes by dragging the edge', async ({ page }, info) => {
    test.skip(info.project.name === 'mobile', 'wide-screen behaviour');
    const box = await page.locator('#railResize').boundingBox();
    await page.mouse.move(box.x + box.width / 2, 300);
    await page.mouse.down();
    await page.mouse.move(400, 300, { steps: 5 });
    await page.mouse.up();
    const w = await page.locator('#sidebar').evaluate(el => Math.round(el.getBoundingClientRect().width));
    expect(w).toBeGreaterThan(390);
    expect(w).toBeLessThan(410);
  });

  test('opens as a drawer on small screens', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile', 'small-screen behaviour');
    const sidebar = page.locator('#sidebar');
    await expect(sidebar).toBeHidden();
    await page.locator('#railToggle').click();
    await expect(sidebar).toBeVisible();
    await expect(page.locator('#railBackdrop')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(sidebar).toBeHidden();
    await page.locator('#railToggle').click();
    await page.locator('#rail button[data-i="5"]').click();      // picking a topic closes the drawer
    await expect(sidebar).toBeHidden();
    await expect(page.locator('#count')).toHaveText(/^Step 1 \//);
    expect(await page.evaluate(() => ti)).toBe(5);
    await page.locator('#railToggle').click();
    await page.locator('#railBackdrop').click({ position: { x: 380, y: 400 } });
    await expect(sidebar).toBeHidden();
  });
});
