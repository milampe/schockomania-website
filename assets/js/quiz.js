/**
 * Schocken Lernquiz
 * Simuliert Runden und testet Wissen über Gewinner, Verlierer und Strafpunkte
 */

(function () {
  'use strict';

  // Konfiguration - kann später durch JSON ersetzt werden
  const CONFIG = {
    throwRanking: [
      {
        key: 'SCHOCK_OUT',
        name: 'Schock-Out',
        penaltyDiscs: 15,
        description: '1-1-1, höchster Wurf im Spiel',
        check: (dice) => dice[0] === 1 && dice[1] === 1 && dice[2] === 1,
        priority: 1
      },
      {
        key: 'JULE',
        name: 'Jule',
        penaltyDiscs: 7,
        description: '1-2-4, zweithöchster Wurf',
        check: (dice) => {
          const sorted = [...dice].sort((a, b) => a - b);
          return sorted[0] === 1 && sorted[1] === 2 && sorted[2] === 4;
        },
        priority: 2
      },
      {
        key: 'SCHOCK',
        name: 'Schock',
        penaltyDiscs: null, // Wird dynamisch berechnet
        description: 'Zwei Einsen + ein anderer Würfel (1-1-2 bis 1-1-6)',
        check: (dice) => {
          const sorted = [...dice].sort((a, b) => a - b);
          // Zwei Einsen + ein anderer Würfel (aber nicht 1-1-1, das ist Schock-Out)
          return sorted[0] === 1 && sorted[1] === 1 && sorted[2] !== 1;
        },
        getPenalty: (dice) => {
          const sorted = [...dice].sort((a, b) => a - b);
          return sorted[2]; // Wert des dritten Würfels (2-6)
        },
        priority: 3
      },
      {
        key: 'GENERAL',
        name: 'General',
        penaltyDiscs: 3,
        description: 'Drei gleiche Würfel (außer 1-1-1)',
        check: (dice) => dice[0] === dice[1] && dice[1] === dice[2] && dice[0] !== 1,
        priority: 4
      },
      {
        key: 'STRAIGHT',
        name: 'Straße',
        penaltyDiscs: 2,
        description: 'Drei aufeinanderfolgende Zahlen',
        check: (dice) => {
          const sorted = [...dice].sort((a, b) => a - b);
          return sorted[1] === sorted[0] + 1 && sorted[2] === sorted[1] + 1;
        },
        priority: 5
      },
      {
        key: 'EYE_THROW',
        name: 'Augenwurf',
        penaltyDiscs: 1,
        description: 'Alle übrigen Würfe',
        check: () => true, // Fallback
        priority: 6
      }
    ],
    players: ['1. Spieler', '2. Spieler', '3. Spieler', '4. Spieler'],
    maxRolls: 3
  };

  // Würfel-Funktion
  function rollDice() {
    return [
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1
    ];
  }

  // Bestimmt die Wurfkategorie
  function categorizeThrow(dice) {
    const sorted = [...dice].sort((a, b) => a - b);
    
    // Prüfe in Prioritätsreihenfolge
    for (const category of CONFIG.throwRanking.sort((a, b) => a.priority - b.priority)) {
      if (category.check(sorted)) {
        return {
          ...category,
          dice: sorted,
          penaltyDiscs: category.penaltyDiscs !== null 
            ? category.penaltyDiscs 
            : (category.getPenalty ? category.getPenalty(sorted) : 1)
        };
      }
    }
    
    // Fallback: Augenwurf
    return {
      key: 'EYE_THROW',
      name: 'Augenwurf',
      dice: sorted,
      penaltyDiscs: 1,
      description: 'Alle übrigen Würfe',
      priority: 6
    };
  }

  // Berechnet den Vergleichswert für die Sortierung
  // Niedrigere Werte = bessere Würfe
  function getThrowValue(category) {
    // Priorität (niedriger = besser)
    const priority = category.priority || 6;
    
    // Bei gleicher Priorität: Bei Schock zählt der Wert, bei Augenwurf die Summe
    if (category.key === 'SCHOCK') {
      // Höherer penaltyDiscs (z.B. 6 bei 1-1-6) = besser = niedrigerer Vergleichswert
      return priority * 1000 - category.penaltyDiscs;
    } else if (category.key === 'EYE_THROW') {
      // Bei Augenwürfen: Höchste Zahl zuerst, dann zweite, dann dritte
      // Würfel sind bereits aufsteigend sortiert, also umkehren für Vergleich
      // z.B. [1, 6, 6] -> Vergleichswert basierend auf 6, 6, 1
      const descending = [...category.dice].sort((a, b) => b - a);
      // Erstelle einen Vergleichswert: höchste Zahl * 100 + zweite * 10 + dritte
      const comparisonValue = descending[0] * 100 + descending[1] * 10 + descending[2];
      return priority * 1000 - comparisonValue;
    } else if (category.key === 'GENERAL') {
      // Bei General: Höherer Wert der drei gleichen = besser
      const value = category.dice[0]; // Alle drei sind gleich
      return priority * 1000 - value;
    } else if (category.key === 'STRAIGHT') {
      // Bei Straße: Höhere Zahlen = besser (z.B. 4-5-6 > 1-2-3)
      const maxValue = Math.max(...category.dice);
      return priority * 1000 - maxValue;
    }
    
    return priority * 1000;
  }

  // Simuliert eine Runde
  function simulateRound() {
    const starterMaxRolls = Math.floor(Math.random() * 3) + 1; // 1-3
    const players = [...CONFIG.players];
    const playerResults = [];

    players.forEach((playerName, index) => {
      const maxRolls = index === 0 ? starterMaxRolls : Math.min(starterMaxRolls, CONFIG.maxRolls);
      const rolls = [];
      
      // Simuliere mehrere Würfe (Spieler kann vorzeitig aufhören)
      let bestCategory = null;
      let bestValue = Infinity;
      
      for (let i = 0; i < maxRolls; i++) {
        const dice = rollDice();
        const category = categorizeThrow(dice);
        const value = getThrowValue(category);
        
        rolls.push({ dice, category });
        
        // Spieler behält den besten Wurf
        if (value < bestValue) {
          bestValue = value;
          bestCategory = category;
        }
      }
      
      playerResults.push({
        name: playerName,
        index: index, // Wurfreihenfolge für Gleichstand-Regel
        rolls: rolls,
        bestCategory: bestCategory,
        bestValue: bestValue
      });
    });

    // Erstelle eine Kopie für Sortierung (behalte Original-Reihenfolge)
    // Bei gleichen bestValue gewinnt der Spieler, der früher gewürfelt hat (niedrigerer Index)
    const sortedResults = [...playerResults].sort((a, b) => {
      if (a.bestValue === b.bestValue) {
        return a.index - b.index; // Niedrigerer Index = früher gewürfelt = besser
      }
      return a.bestValue - b.bestValue;
    });
    
    // Für Verlierer: Bei Gleichstand verliert der Spieler, der später gewürfelt hat (höherer Index)
    const sortedForLoser = [...playerResults].sort((a, b) => {
      if (a.bestValue === b.bestValue) {
        return b.index - a.index; // Höherer Index = später gewürfelt = schlechter
      }
      return b.bestValue - a.bestValue; // Umgekehrte Sortierung für Verlierer
    });
    
    const bestPlayer = sortedResults[0];
    const worstPlayer = sortedForLoser[0];
    const bestThrowKey = bestPlayer.bestCategory.key;
    const penaltyDiscs = bestPlayer.bestCategory.penaltyDiscs;

    return {
      players: playerResults, // Original-Reihenfolge für Anzeige
      sortedPlayers: sortedResults, // Sortiert für Bestimmung von Gewinner/Verlierer
      starterMaxRolls,
      bestPlayer: bestPlayer.name,
      worstPlayer: worstPlayer.name,
      bestThrowKey,
      penaltyDiscs
    };
  }

  // Quiz-State
  let currentRound = null;
  let userAnswers = {
    winner: null,
    loser: null,
    penaltyDiscs: null
  };

  // DOM-Elemente
  const quizSection = document.getElementById('learn-quiz');
  if (!quizSection) return;

  const newRoundBtn = quizSection.querySelector('.quiz-new-round');
  const checkBtn = quizSection.querySelector('.quiz-check');
  const nextRoundBtn = quizSection.querySelector('.quiz-next');
  const resultBox = quizSection.querySelector('.quiz-result');
  const winnerRadios = quizSection.querySelectorAll('input[name="quiz-winner"]');
  const loserRadios = quizSection.querySelectorAll('input[name="quiz-loser"]');
  const penaltyButtons = quizSection.querySelectorAll('.quiz-penalty-btn');
  const throwsDisplay = quizSection.querySelector('.quiz-throws-display');
  const throwsGrid = quizSection.querySelector('.quiz-throws-grid');

  // Initialisiere Quiz
  function initQuiz() {
    if (newRoundBtn) {
      newRoundBtn.addEventListener('click', startNewRound);
    }
    if (checkBtn) {
      checkBtn.addEventListener('click', checkAnswers);
    }
    if (nextRoundBtn) {
      nextRoundBtn.addEventListener('click', startNewRound);
    }

    // Radio-Buttons
    winnerRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        userAnswers.winner = radio.value;
      });
    });

    loserRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        userAnswers.loser = radio.value;
      });
    });

    // Strafpunkte-Buttons
    penaltyButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        penaltyButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        userAnswers.penaltyDiscs = parseInt(btn.dataset.penalty, 10);
      });
    });

    // Starte erste Runde
    startNewRound();
  }

  // Startet eine neue Runde
  function startNewRound() {
    currentRound = simulateRound();
    userAnswers = { winner: null, loser: null, penaltyDiscs: null };

    // Reset UI
    if (resultBox) {
      resultBox.classList.remove('show', 'correct', 'incorrect');
      resultBox.innerHTML = '';
    }

    // Reset Radio-Buttons
    winnerRadios.forEach(radio => {
      radio.checked = false;
      radio.disabled = false;
    });
    loserRadios.forEach(radio => {
      radio.checked = false;
      radio.disabled = false;
    });

    // Reset Strafpunkte-Buttons
    penaltyButtons.forEach(btn => {
      btn.classList.remove('active');
      btn.disabled = false;
    });

    // Zeige gewürfelte Runde
    if (throwsGrid && currentRound) {
      throwsGrid.innerHTML = '';
      
      currentRound.players.forEach(player => {
        const playerCard = document.createElement('div');
        playerCard.className = 'quiz-throw-card';
        
        // Bei Augenwürfen: absteigend sortieren (höchste Zahl zuerst)
        let diceDisplay;
        if (player.bestCategory.key === 'EYE_THROW') {
          const descending = [...player.bestCategory.dice].sort((a, b) => b - a);
          diceDisplay = descending.join('-');
        } else {
          diceDisplay = player.bestCategory.dice.join('-');
        }
        
        const categoryName = player.bestCategory.name;
        
        playerCard.innerHTML = `
          <div class="quiz-throw-player">${player.name}</div>
          <div class="quiz-throw-dice">${diceDisplay}</div>
          <div class="quiz-throw-category">${categoryName}</div>
        `;
        
        throwsGrid.appendChild(playerCard);
      });
    }

    // Buttons aktivieren
    if (checkBtn) {
      checkBtn.disabled = false;
      checkBtn.style.display = 'block';
    }
    if (newRoundBtn) {
      newRoundBtn.disabled = false;
      newRoundBtn.style.display = 'block';
    }
    if (nextRoundBtn) nextRoundBtn.style.display = 'none';
  }

  // Prüft die Antworten
  function checkAnswers() {
    if (!currentRound) return;

    const correct = 
      userAnswers.winner === currentRound.bestPlayer &&
      userAnswers.loser === currentRound.worstPlayer &&
      userAnswers.penaltyDiscs === currentRound.penaltyDiscs;

    // Deaktiviere alle Inputs
    winnerRadios.forEach(radio => radio.disabled = true);
    loserRadios.forEach(radio => radio.disabled = true);
    penaltyButtons.forEach(btn => btn.disabled = true);
    if (checkBtn) {
      checkBtn.disabled = true;
      checkBtn.style.display = 'none';
    }
    if (newRoundBtn) {
      newRoundBtn.disabled = true;
      newRoundBtn.style.display = 'none';
    }

    // Zeige Ergebnis
    if (resultBox) {
      resultBox.classList.add('show');
      resultBox.classList.add(correct ? 'correct' : 'incorrect');

      const bestCategory = (currentRound.sortedPlayers || currentRound.players).find(p => p.name === currentRound.bestPlayer).bestCategory;
      const worstCategory = (currentRound.sortedPlayers || currentRound.players).find(p => p.name === currentRound.worstPlayer).bestCategory;

      // Formatierung für Anzeige: Augenwürfe absteigend
      const formatDiceDisplay = (category) => {
        if (category.key === 'EYE_THROW') {
          const descending = [...category.dice].sort((a, b) => b - a);
          return descending.join('-');
        }
        return category.dice.join('-');
      };

      const bestDiceDisplay = formatDiceDisplay(bestCategory);
      const worstDiceDisplay = formatDiceDisplay(worstCategory);

      let explanation = '';
      if (correct) {
        explanation = '<p class="quiz-result-title">✓ Richtig!</p>';
      } else {
        explanation = '<p class="quiz-result-title">✗ Nicht ganz richtig</p>';
      }

      explanation += `
        <div class="quiz-explanation">
          <p><strong>Gewinner:</strong> ${currentRound.bestPlayer} mit ${bestDiceDisplay} (${bestCategory.name})</p>
          <p><strong>Verlierer:</strong> ${currentRound.worstPlayer} mit ${worstDiceDisplay} (${worstCategory.name})</p>
          <p><strong>Strafpunkte:</strong> ${currentRound.penaltyDiscs} (basierend auf ${bestCategory.name})</p>
          <p class="quiz-rule-text">${bestCategory.description}</p>
        </div>
      `;

      resultBox.innerHTML = explanation;
      if (nextRoundBtn) nextRoundBtn.style.display = 'block';
    }
  }

  // Initialisiere beim Laden
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initQuiz);
  } else {
    initQuiz();
  }
})();
