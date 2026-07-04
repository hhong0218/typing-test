/*
 * TypeTest timed-test engine (typing.quietools.com)
 * Extracted from the index page inline script so timed variants (e.g. the
 * 1-minute test) can reuse it without duplicating the engine.
 *
 * Pages configure it BEFORE loading this script via:
 *   window.TT_CONFIG = {
 *     testType: 'speed',                 // GA4 test_type param (qtEvent convention)
 *     duration: 30,                      // initial duration in seconds
 *     bestKey:  'typetest_best_wpm',     // localStorage key for personal best
 *     texts:    [ ... ]                  // optional: replace the default passage pool
 *   };
 * All fields optional — defaults match the original index-page behavior.
 * A page without a #modeSeg duration selector simply keeps its fixed duration.
 */
(function(){
    "use strict";

    const CFG = window.TT_CONFIG || {};

    // ---- Text pool (common English words & sentences) ----
    const TEXTS = CFG.texts || [
      "The quick brown fox jumps over the lazy dog while the sun sets slowly behind the quiet hills and a cool breeze drifts across the open field.",
      "Learning to type quickly is a skill that improves with steady practice. Focus on accuracy first and let your speed grow naturally over time.",
      "Every morning she made a cup of coffee, opened the window, and listened to the city wake up. The small ritual gave her a calm start to the day.",
      "Technology changes the way we live and work, but the basics still matter. Clear thinking, honest effort, and a little patience go a long way.",
      "A good book can take you anywhere. With a single page you might travel across oceans, meet strange people, and return home before dinner.",
      "The river moved slowly under the old stone bridge. Children threw small pebbles into the water and watched the ripples spread toward the shore.",
      "Success is rarely about luck. It is the result of many small choices made day after day, each one pushing you a little closer to your goal.",
      "When the rain finally stopped, the streets shone under the lamplight. People stepped outside, opened their umbrellas, and went on with their evening.",
      "Practice does not make perfect on its own. Practice with focus and honest feedback is what slowly turns a beginner into a confident expert.",
      "The garden was full of color in the late spring. Bright flowers leaned toward the warm light while bees moved quietly from one bloom to the next.",
      "Good writing is simple and direct. Use short words when they work, keep your sentences clear, and trust the reader to follow your idea.",
      "He packed a small bag, locked the door, and walked to the station. The train was on time, and within an hour the city was far behind him."
    ];

    // ---- State ----
    const TEST_TYPE = CFG.testType || 'speed';
    let duration = CFG.duration || 30;   // seconds
    let target = "";             // current passage text
    let timerId = null;
    let started = false;
    let finished = false;
    let startTime = 0;
    let remaining = duration;
    let typed = "";              // what the user has typed so far
    let correctCount = 0;        // correct chars (current)
    let totalCount = 0;          // total chars typed (current)
    const BEST_KEY = CFG.bestKey || "typetest_best_wpm";

    // ---- Elements ----
    const passageEl = document.getElementById('passage');
    const hidden = document.getElementById('hiddenInput');
    const numTime = document.getElementById('numTime');
    const numWpm = document.getElementById('numWpm');
    const numAcc = document.getElementById('numAcc');
    const headerBest = document.getElementById('headerBest');
    const resultEl = document.getElementById('result');
    const rWpm = document.getElementById('rWpm');
    const rAcc = document.getElementById('rAcc');
    const rChars = document.getElementById('rChars');
    const rBest = document.getElementById('rBest');
    const pbBadge = document.getElementById('pbBadge');
    const shareText = document.getElementById('shareText');
    const toast = document.getElementById('toast');

    // ---- Helpers ----
    function pickText(){
      let t;
      do { t = TEXTS[Math.floor(Math.random()*TEXTS.length)]; }
      while (TEXTS.length > 1 && t === target);
      return t;
    }

    function getBest(){
      const v = parseInt(localStorage.getItem(BEST_KEY) || "0", 10);
      return isNaN(v) ? 0 : v;
    }
    function setBest(v){ try{ localStorage.setItem(BEST_KEY, String(v)); }catch(e){} }
    function refreshBestDisplay(){
      const b = getBest();
      headerBest.textContent = b > 0 ? b : "—";
    }

    function computeWpm(correct, minutes){
      if (minutes <= 0) return 0;
      return Math.round((correct / 5) / minutes);
    }
    function computeAcc(correct, total){
      if (total === 0) return 100;
      return Math.round((correct / total) * 100);
    }

    // ---- Render passage with per-character coloring ----
    function render(){
      const frag = document.createDocumentFragment();
      correctCount = 0;
      totalCount = typed.length;
      for (let i = 0; i < target.length; i++){
        const span = document.createElement('span');
        const tch = target[i];
        span.className = 'ch';
        // show a visible representation but keep actual char for spaces
        span.textContent = tch;
        if (i < typed.length){
          if (typed[i] === tch){
            span.classList.add('correct');
            correctCount++;
          } else {
            span.classList.add('incorrect');
            if (tch === ' ') span.classList.add('space');
          }
        } else if (i === typed.length){
          span.classList.add('current');
        }
        frag.appendChild(span);
      }
      passageEl.innerHTML = '';
      passageEl.appendChild(frag);
    }

    function updateLiveStats(){
      // time-based live stats
      let minutes;
      if (started && !finished){
        minutes = (Date.now() - startTime) / 60000;
      } else {
        minutes = 0;
      }
      numWpm.textContent = computeWpm(correctCount, minutes);
      numAcc.textContent = computeAcc(correctCount, totalCount) + '%';
    }

    // ---- Timer ----
    function tick(){
      const elapsed = (Date.now() - startTime) / 1000;
      remaining = Math.max(0, duration - elapsed);
      numTime.textContent = Math.ceil(remaining);
      updateLiveStats();
      if (remaining <= 0){
        finish();
      }
    }

    function startTimer(){
      started = true;
      startTime = Date.now();
      timerId = setInterval(tick, 100);
      if (window.qtEvent) qtEvent('test_start', { test_type: TEST_TYPE });
    }

    // ---- Lifecycle ----
    function resetTest(newText){
      clearInterval(timerId);
      timerId = null;
      started = false;
      finished = false;
      typed = "";
      correctCount = 0;
      totalCount = 0;
      remaining = duration;
      if (newText || !target) target = pickText();
      hidden.value = "";
      numTime.textContent = duration;
      numWpm.textContent = "0";
      numAcc.textContent = "100%";
      resultEl.classList.remove('show');
      pbBadge.style.display = 'none';
      toast.textContent = "";
      render();
    }

    function finish(){
      if (finished) return;
      finished = true;
      clearInterval(timerId);
      timerId = null;

      // Final metrics: use actual elapsed time (capped at duration)
      const elapsedMs = started ? Math.min(Date.now() - startTime, duration*1000) : 0;
      const minutes = elapsedMs / 60000;
      const wpm = computeWpm(correctCount, minutes || (duration/60));
      const acc = computeAcc(correctCount, totalCount);

      numTime.textContent = "0";
      numWpm.textContent = wpm;
      numAcc.textContent = acc + '%';

      // best
      const prevBest = getBest();
      let best = prevBest;
      if (wpm > prevBest){
        best = wpm;
        setBest(best);
        pbBadge.style.display = 'inline-block';
      } else {
        pbBadge.style.display = 'none';
      }
      refreshBestDisplay();

      rWpm.textContent = wpm;
      rAcc.textContent = acc + '%';
      rChars.textContent = totalCount;
      rBest.textContent = best;
      shareText.textContent = `I typed ${wpm} WPM with ${acc}% accuracy on a ${duration}s typing test.`;

      resultEl.classList.add('show');

      try { gtag('event', 'typing_test_complete', { wpm: wpm, accuracy: acc, duration: duration, test_type: TEST_TYPE }); } catch(e){}
      if (window.qtEvent) qtEvent('test_complete', { test_type: TEST_TYPE, wpm: wpm, accuracy: acc });
    }

    // ---- Input handling ----
    function focusInput(){ hidden.focus(); }

    passageEl.addEventListener('mousedown', function(e){ e.preventDefault(); focusInput(); });
    passageEl.addEventListener('click', focusInput);

    hidden.addEventListener('focus', function(){
      passageEl.classList.add('focused');
      passageEl.classList.remove('blurred');
    });
    hidden.addEventListener('blur', function(){
      passageEl.classList.remove('focused');
      passageEl.classList.add('blurred');
    });

    hidden.addEventListener('input', function(){
      if (finished) { hidden.value = typed; return; }
      let val = hidden.value;
      // limit to target length
      if (val.length > target.length) val = val.slice(0, target.length);
      typed = val;

      if (!started && typed.length > 0){
        startTimer();
      }

      render();
      updateLiveStats();

      // finished by completing the whole passage
      if (typed.length >= target.length){
        finish();
      }
    });

    // Block the Enter key from doing anything odd; allow normal typing/backspace
    hidden.addEventListener('keydown', function(e){
      if (e.key === 'Enter') e.preventDefault();
    });

    // Typing anywhere on the page focuses the input (nice UX), except when interacting with buttons/inputs
    document.addEventListener('keydown', function(e){
      const tag = (e.target.tagName || '').toLowerCase();
      if (e.target === hidden) return;
      if (tag === 'button' || tag === 'input' || tag === 'textarea' || tag === 'a') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // only react to characters and backspace
      if (e.key.length === 1 || e.key === 'Backspace'){
        focusInput();
      }
    });

    // ---- Controls ----
    const modeSeg = document.getElementById('modeSeg');
    if (modeSeg) modeSeg.addEventListener('click', function(e){
      const btn = e.target.closest('button[data-dur]');
      if (!btn) return;
      [].forEach.call(this.querySelectorAll('button'), b => b.classList.remove('active'));
      btn.classList.add('active');
      duration = parseInt(btn.dataset.dur, 10);
      resetTest(false); // keep same text, just reset clock
      focusInput();
    });

    document.getElementById('newTextBtn').addEventListener('click', function(){
      resetTest(true);
      focusInput();
    });
    document.getElementById('restartBtn').addEventListener('click', function(){
      resetTest(false);
      focusInput();
    });
    document.getElementById('tryAgainBtn').addEventListener('click', function(){
      resetTest(true);   // fresh text on "Try again"
      focusInput();
    });

    document.getElementById('copyShareBtn').addEventListener('click', function(){
      const text = shareText.textContent;
      if (window.qtEvent) qtEvent('copy_result', { test_type: TEST_TYPE });
      const done = () => { toast.textContent = "Copied to clipboard!"; setTimeout(()=>toast.textContent="", 2200); };
      if (navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(text).then(done).catch(fallbackCopy);
      } else {
        fallbackCopy();
      }
      function fallbackCopy(){
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position='fixed'; ta.style.opacity='0';
        document.body.appendChild(ta); ta.select();
        try{ document.execCommand('copy'); done(); }catch(e){ toast.textContent="Press Ctrl+C to copy."; }
        document.body.removeChild(ta);
      }
    });

    // ---- Init ----
    refreshBestDisplay();
    resetTest(true);
    // auto-focus on load for desktop convenience
    setTimeout(focusInput, 200);
})();
