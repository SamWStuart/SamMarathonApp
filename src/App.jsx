import { useState, useEffect } from 'react'
import { auth, db, signInWithGoogle, signOutUser, onAuthChange } from './firebase.js'
import {
  collection, addDoc, deleteDoc, doc, onSnapshot,
  query, orderBy, serverTimestamp
} from 'firebase/firestore'

// ─── Training Data ────────────────────────────────────────────────────────────

const PHASES = [
  {
    id: 'base1', name: 'Base Phase 1', subtitle: 'Reactivate',
    months: 'June', color: '#4ade80',
    goal: 'Rebuild consistency without injury. 3–4 runs/week, all easy. Get to 20 miles/week.',
    keyFocus: [
      'Zone 2 only — HR-based pacing, not pace-based',
      'Strength 2×/week (injury prevention is the priority)',
      'Leg routine every single run, no exceptions',
      'Bike 1×/week cross-training',
    ],
    weeks: [
      { num:1, dates:'Jun 1–7',   totalMiles:'~14', days:[
        {day:'Mon', type:'Long Run',    detail:'7 miles easy (Z2)',                    miles:7},
        {day:'Tue', type:'Rest',        detail:'10 min leg routine + stretch',         miles:0},
        {day:'Wed', type:'Easy Run',    detail:'4 miles easy',                         miles:4},
        {day:'Thu', type:'Soccer',      detail:'Thursday league — moderate effort',    miles:0},
        {day:'Fri', type:'Strength',    detail:'20 min bodyweight: glutes, hips, single-leg', miles:0},
        {day:'Sat', type:'Easy/Bike',   detail:'3 miles easy OR 45 min bike',          miles:3},
        {day:'Sun', type:'Rest',        detail:'Full rest or walk',                    miles:0},
      ]},
      { num:2, dates:'Jun 8–14',  totalMiles:'~16', days:[
        {day:'Mon', type:'Long Run',    detail:'8 miles easy (Z2)',                    miles:8},
        {day:'Tue', type:'Strength',    detail:'20 min: squats, lunges, hip bridges, calf raises', miles:0},
        {day:'Wed', type:'Easy Run',    detail:'4 miles easy',                         miles:4},
        {day:'Thu', type:'Soccer',      detail:'Thursday league',                      miles:0},
        {day:'Fri', type:'Easy Run',    detail:'4 miles easy',                         miles:4},
        {day:'Sat', type:'Bike',        detail:'45–60 min easy ride',                  miles:0},
        {day:'Sun', type:'Rest',        detail:'Full rest + 10 min stretching',        miles:0},
      ]},
      { num:3, dates:'Jun 15–21', totalMiles:'~18', days:[
        {day:'Mon', type:'Long Run',    detail:'9 miles easy (Z2)',                    miles:9},
        {day:'Tue', type:'Strength',    detail:'20 min: single-leg deadlifts, step-ups, planks', miles:0},
        {day:'Wed', type:'Easy Run',    detail:'5 miles easy',                         miles:5},
        {day:'Thu', type:'Soccer',      detail:'Thursday league',                      miles:0},
        {day:'Fri', type:'Easy Run',    detail:'4 miles easy',                         miles:4},
        {day:'Sat', type:'Bike',        detail:'60 min easy bike or rest',             miles:0},
        {day:'Sun', type:'Rest',        detail:'Full rest',                            miles:0},
      ]},
      { num:4, dates:'Jun 22–28', totalMiles:'~14 ↓', cutback:true, days:[
        {day:'Mon', type:'Long Run',    detail:'7 miles easy — CUTBACK WEEK',          miles:7},
        {day:'Tue', type:'Strength',    detail:'20 min strength (lighter)',            miles:0},
        {day:'Wed', type:'Easy Run',    detail:'4 miles easy',                         miles:4},
        {day:'Thu', type:'Soccer',      detail:'Thursday league',                      miles:0},
        {day:'Fri', type:'Rest',        detail:'Full rest',                            miles:0},
        {day:'Sat', type:'Easy Run',    detail:'3 miles easy',                         miles:3},
        {day:'Sun', type:'Rest',        detail:'Full rest + extra stretching',         miles:0},
      ]},
    ],
  },
  {
    id: 'base2', name: 'Base Phase 2', subtitle: 'Aerobic Foundation',
    months: 'July', color: '#fb923c',
    goal: 'Build to 25–30 miles/week. Introduce strides. Run by effort — heat will spike HR.',
    keyFocus: [
      'Heat adaptation: run early morning, go by effort not pace',
      'Add strides (4×20 sec) at end of one run per week',
      'Practice drinking on the run — every long run',
      'Strength 2×/week, maintain leg routine',
    ],
    weeks: [
      { num:5, dates:'Jun 29–Jul 5',  totalMiles:'~21', days:[
        {day:'Mon', type:'Long Run',    detail:'10 miles easy (Z2, early AM)',          miles:10},
        {day:'Tue', type:'Strength',    detail:'25 min: focus on glutes & hips',        miles:0},
        {day:'Wed', type:'Easy Run',    detail:'5 miles easy + 4 strides',              miles:5},
        {day:'Thu', type:'Soccer',      detail:'Thursday league',                       miles:0},
        {day:'Fri', type:'Easy Run',    detail:'6 miles easy',                          miles:6},
        {day:'Sat', type:'Bike',        detail:'60 min easy ride',                      miles:0},
        {day:'Sun', type:'Rest',        detail:'Full rest',                             miles:0},
      ]},
      { num:6, dates:'Jul 6–12',      totalMiles:'~23', days:[
        {day:'Mon', type:'Long Run',    detail:'11 miles easy (Z2, early AM)',          miles:11},
        {day:'Tue', type:'Strength',    detail:'25 min strength',                       miles:0},
        {day:'Wed', type:'Easy Run',    detail:'5 miles easy + 4 strides',              miles:5},
        {day:'Thu', type:'Soccer',      detail:'Thursday league',                       miles:0},
        {day:'Fri', type:'Easy Run',    detail:'7 miles easy',                          miles:7},
        {day:'Sat', type:'Bike',        detail:'60 min easy ride',                      miles:0},
        {day:'Sun', type:'Rest',        detail:'Full rest',                             miles:0},
      ]},
      { num:7, dates:'Jul 13–19',     totalMiles:'~26', days:[
        {day:'Mon', type:'Long Run',    detail:'13 miles easy — carry water & gel (practice!)', miles:13},
        {day:'Tue', type:'Strength',    detail:'25 min: single-leg work, core',         miles:0},
        {day:'Wed', type:'Easy Run',    detail:'6 miles easy',                          miles:6},
        {day:'Thu', type:'Soccer',      detail:'Thursday league',                       miles:0},
        {day:'Fri', type:'Easy Run',    detail:'7 miles easy + 4 strides',              miles:7},
        {day:'Sat', type:'Bike',        detail:'60 min bike or rest',                   miles:0},
        {day:'Sun', type:'Rest',        detail:'Full rest',                             miles:0},
      ]},
      { num:8, dates:'Jul 20–26',     totalMiles:'~18 ↓', cutback:true, days:[
        {day:'Mon', type:'Long Run',    detail:'9 miles easy — CUTBACK WEEK',           miles:9},
        {day:'Tue', type:'Strength',    detail:'20 min (lighter week)',                 miles:0},
        {day:'Wed', type:'Easy Run',    detail:'5 miles easy',                          miles:5},
        {day:'Thu', type:'Soccer',      detail:'Thursday league',                       miles:0},
        {day:'Fri', type:'Easy Run',    detail:'4 miles easy',                          miles:4},
        {day:'Sat', type:'Bike',        detail:'Rest or 45 min easy ride',              miles:0},
        {day:'Sun', type:'Rest',        detail:'Full rest + foam rolling',              miles:0},
      ]},
    ],
  },
  {
    id: 'build1', name: 'Build Phase 1', subtitle: 'Introduce Structure',
    months: 'August', color: '#60a5fa',
    goal: '30–35 miles/week peak. Long runs to 16 miles. Weekly marathon-pace workout.',
    keyFocus: [
      'MP workout 1×/week: 4–6 miles at ~8:45 effort',
      'Long runs with gel practice every 40–45 min',
      'Strength 2×/week — do not skip',
      'Heat still real: run before 8am or after 7pm',
    ],
    weeks: [
      { num:9,  dates:'Jul 27–Aug 2',  totalMiles:'~27', days:[
        {day:'Mon', type:'Long Run',    detail:'14 miles easy — gel at mi 5 & 10',      miles:14},
        {day:'Tue', type:'Strength',    detail:'30 min: focus on posterior chain',       miles:0},
        {day:'Wed', type:'MP Workout',  detail:'8 mi: 2 easy + 4 at MP (~8:45) + 2 easy', miles:8},
        {day:'Thu', type:'Soccer',      detail:'Thursday league — easy effort',          miles:0},
        {day:'Fri', type:'Easy Run',    detail:'5 miles easy',                           miles:5},
        {day:'Sat', type:'Bike',        detail:'60–75 min easy ride',                    miles:0},
        {day:'Sun', type:'Rest',        detail:'Full rest',                              miles:0},
      ]},
      { num:10, dates:'Aug 3–9',      totalMiles:'~30', days:[
        {day:'Mon', type:'Long Run',    detail:'15 miles easy — gel every 45 min',       miles:15},
        {day:'Tue', type:'Strength',    detail:'30 min strength',                        miles:0},
        {day:'Wed', type:'MP Workout',  detail:'9 mi: 2 easy + 5 at MP + 2 easy',       miles:9},
        {day:'Thu', type:'Soccer',      detail:'Thursday league',                        miles:0},
        {day:'Fri', type:'Easy Run',    detail:'6 miles easy',                           miles:6},
        {day:'Sat', type:'Bike',        detail:'75 min easy ride',                       miles:0},
        {day:'Sun', type:'Rest',        detail:'Full rest',                              miles:0},
      ]},
      { num:11, dates:'Aug 10–16',     totalMiles:'~33', days:[
        {day:'Mon', type:'Long Run',    detail:'16 miles — gel every 45 min, carry water', miles:16},
        {day:'Tue', type:'Strength',    detail:'30 min: single-leg, core stability',      miles:0},
        {day:'Wed', type:'MP Workout',  detail:'10 mi: 2 easy + 6 at MP + 2 easy',       miles:10},
        {day:'Thu', type:'Soccer',      detail:'Thursday league',                         miles:0},
        {day:'Fri', type:'Easy Run',    detail:'7 miles easy',                            miles:7},
        {day:'Sat', type:'Bike',        detail:'75 min ride',                             miles:0},
        {day:'Sun', type:'Rest',        detail:'Full rest',                               miles:0},
      ]},
      { num:12, dates:'Aug 17–23',     totalMiles:'~22 ↓', cutback:true, days:[
        {day:'Mon', type:'Long Run',    detail:'11 miles easy — CUTBACK WEEK',            miles:11},
        {day:'Tue', type:'Strength',    detail:'20 min (lighter)',                        miles:0},
        {day:'Wed', type:'Easy Run',    detail:'6 miles easy + strides',                  miles:6},
        {day:'Thu', type:'Soccer',      detail:'Thursday league',                         miles:0},
        {day:'Fri', type:'Easy Run',    detail:'5 miles easy',                            miles:5},
        {day:'Sat', type:'Bike',        detail:'Rest or easy 45 min ride',                miles:0},
        {day:'Sun', type:'Rest',        detail:'Full rest + foam rolling',                miles:0},
      ]},
    ],
  },
  {
    id: 'build2', name: 'Build Phase 2', subtitle: 'Race-Specific',
    months: 'September', color: '#c084fc',
    goal: '35–40 miles/week peak. Long runs 18–20 miles. Back-to-back medium longs. Nail fueling.',
    keyFocus: [
      'Back-to-back medium-long days simulate race fatigue',
      'Gel practice is non-negotiable on every long run',
      'MP workouts get harder: longer segments, less recovery',
      'Soccer: dial back intensity during high-mileage weeks',
    ],
    weeks: [
      { num:13, dates:'Aug 24–30',     totalMiles:'~34', days:[
        {day:'Mon', type:'Long Run',    detail:'17 miles — gel mi 5, 10, 14',            miles:17},
        {day:'Tue', type:'Strength+Easy',detail:'30 min strength + 6 miles easy (fatigue run)', miles:6},
        {day:'Wed', type:'MP Workout',  detail:'10 mi: 1 easy + 7 at MP + 2 easy',       miles:10},
        {day:'Thu', type:'Soccer',      detail:'Thursday league — easy effort',           miles:0},
        {day:'Fri', type:'Easy Run',    detail:'7 miles easy',                            miles:7},
        {day:'Sat', type:'Bike',        detail:'75–90 min easy ride',                     miles:0},
        {day:'Sun', type:'Rest',        detail:'Full rest',                               miles:0},
      ]},
      { num:14, dates:'Aug 31–Sep 6',       totalMiles:'~37', days:[
        {day:'Mon', type:'Long Run',    detail:'18 miles — gel every 40 min',             miles:18},
        {day:'Tue', type:'Easy+Strength',detail:'7 miles easy + 30 min strength',         miles:7},
        {day:'Wed', type:'MP Workout',  detail:'11 mi: 1 easy + 8 at MP + 2 easy',        miles:11},
        {day:'Thu', type:'Soccer',      detail:'Thursday league',                          miles:0},
        {day:'Fri', type:'Easy Run',    detail:'8 miles easy',                             miles:8},
        {day:'Sat', type:'Bike',        detail:'60 min bike or rest',                      miles:0},
        {day:'Sun', type:'Rest',        detail:'Full rest',                                miles:0},
      ]},
      { num:15, dates:'Sep 7–13',      totalMiles:'~40', days:[
        {day:'Mon', type:'Long Run',    detail:'20 miles — full race fueling simulation',  miles:20},
        {day:'Tue', type:'Easy+Strength',detail:'7 miles easy + 30 min strength',          miles:7},
        {day:'Wed', type:'MP Workout',  detail:'12 mi: 1 easy + 9 at MP + 2 easy',         miles:12},
        {day:'Thu', type:'Soccer',      detail:'Thursday league — moderate',               miles:0},
        {day:'Fri', type:'Easy Run',    detail:'8 miles easy',                             miles:8},
        {day:'Sat', type:'Bike',        detail:'75 min easy ride',                         miles:0},
        {day:'Sun', type:'Rest',        detail:'Full rest',                                miles:0},
      ]},
      { num:16, dates:'Sep 14–20',     totalMiles:'~26 ↓', cutback:true, days:[
        {day:'Mon', type:'Long Run',    detail:'13 miles easy — CUTBACK WEEK',             miles:13},
        {day:'Tue', type:'Strength',    detail:'25 min (lighter)',                         miles:0},
        {day:'Wed', type:'Easy Run',    detail:'7 miles easy + strides',                   miles:7},
        {day:'Thu', type:'Soccer',      detail:'Thursday league',                          miles:0},
        {day:'Fri', type:'Easy Run',    detail:'6 miles easy',                             miles:6},
        {day:'Sat', type:'Bike',        detail:'Rest or 45 min ride',                      miles:0},
        {day:'Sun', type:'Rest',        detail:'Full rest',                                miles:0},
      ]},
    ],
  },
  {
    id: 'peak', name: 'Peak', subtitle: 'Peak & Consolidate',
    months: 'October', color: '#f87171',
    goal: 'Peak weeks 40–42 miles. Final 20-miler. Then 3-week taper begins Oct 20.',
    keyFocus: [
      'One final 20–22 mile long run (Oct 6 week)',
      'Trust the fitness — resist adding miles',
      'Taper starts Oct 20',
      'Sleep and nutrition become as important as running',
    ],
    weeks: [
      { num:17, dates:'Sep 21–27',     totalMiles:'~38', days:[
        {day:'Mon', type:'Long Run',    detail:'19 miles — race-pace last 3 miles if feeling good', miles:19},
        {day:'Tue', type:'Easy+Strength',detail:'6 miles easy + 30 min strength',         miles:6},
        {day:'Wed', type:'MP Workout',  detail:'11 mi: 1 easy + 8 at MP + 2 easy',        miles:11},
        {day:'Thu', type:'Soccer',      detail:'Thursday league',                          miles:0},
        {day:'Fri', type:'Easy Run',    detail:'7 miles easy',                             miles:7},
        {day:'Sat', type:'Bike',        detail:'60 min easy ride',                         miles:0},
        {day:'Sun', type:'Rest',        detail:'Full rest',                                miles:0},
      ]},
      { num:18, dates:'Sep 28–Oct 4',  totalMiles:'~40', days:[
        {day:'Mon', type:'Long Run',    detail:'20 miles — race-pace miles 16–19',         miles:20},
        {day:'Tue', type:'Easy+Strength',detail:'7 miles easy + 30 min strength',          miles:7},
        {day:'Wed', type:'MP Workout',  detail:'12 mi: 1 easy + 9 at MP + 2 easy',         miles:12},
        {day:'Thu', type:'Soccer',      detail:'Thursday league',                           miles:0},
        {day:'Fri', type:'Easy Run',    detail:'8 miles easy',                              miles:8},
        {day:'Sat', type:'Bike',        detail:'75 min ride',                               miles:0},
        {day:'Sun', type:'Rest',        detail:'Full rest',                                 miles:0},
      ]},
      { num:19, dates:'Oct 5–11',      totalMiles:'~42 ★', peak:true, days:[
        {day:'Mon', type:'Long Run',    detail:'22 miles — PEAK LONG RUN — complete race fueling', miles:22},
        {day:'Tue', type:'Easy+Strength',detail:'7 miles easy + 30 min strength (last hard session)', miles:7},
        {day:'Wed', type:'MP Workout',  detail:'12 mi: 1 easy + 9 at MP + 2 easy',          miles:12},
        {day:'Thu', type:'Soccer',      detail:'Thursday league — EASY ONLY',               miles:0},
        {day:'Fri', type:'Easy Run',    detail:'8 miles easy',                               miles:8},
        {day:'Sat', type:'Rest',        detail:"Full rest — you've done the work",           miles:0},
        {day:'Sun', type:'Rest',        detail:'Full rest',                                   miles:0},
      ]},
      { num:20, dates:'Oct 12–18',     totalMiles:'~30 (taper begins)', taper:true, days:[
        {day:'Mon', type:'Long Run',    detail:'16 miles — TAPER BEGINS, keep easy',        miles:16},
        {day:'Tue', type:'Strength',    detail:'20 min light maintenance strength',          miles:0},
        {day:'Wed', type:'MP Workout',  detail:'9 mi: 1 easy + 6 at MP + 2 easy',           miles:9},
        {day:'Thu', type:'Soccer',      detail:'Thursday league — moderate',                 miles:0},
        {day:'Fri', type:'Easy Run',    detail:'5 miles easy',                               miles:5},
        {day:'Sat', type:'Bike',        detail:'Easy 45 min bike or rest',                   miles:0},
        {day:'Sun', type:'Rest',        detail:'Full rest',                                   miles:0},
      ]},
    ],
  },
  {
    id: 'taper', name: 'Taper', subtitle: 'Rest & Race',
    months: 'November', color: '#fbbf24',
    goal: 'Trust the bank account of fitness. Stay sharp, stay fresh. Execute the race plan.',
    keyFocus: [
      'Mileage drops but brief intensity stays',
      'Sleep 8+ hours — this is training',
      'Race strategy: start slow mi 1–6 at 9:10, trust the back half',
      'Eat at miles 5, 10, 15, 20 — no exceptions',
    ],
    weeks: [
      { num:21, dates:'Oct 19–25',     totalMiles:'~22', taper:true, days:[
        {day:'Mon', type:'Medium Long', detail:'12 miles easy — last longish run',          miles:12},
        {day:'Tue', type:'Strength',    detail:'15 min very light strength',                miles:0},
        {day:'Wed', type:'Tune-up',     detail:'7 mi: 2 easy + 3 at MP + 2 easy',          miles:7},
        {day:'Thu', type:'Soccer',      detail:'Thursday league — easy',                    miles:0},
        {day:'Fri', type:'Easy Run',    detail:'5 miles easy',                              miles:5},
        {day:'Sat', type:'Rest',        detail:'Full rest',                                 miles:0},
        {day:'Sun', type:'Rest',        detail:'Full rest',                                 miles:0},
      ]},
      { num:22, dates:'Oct 26–Nov 1',  totalMiles:'~15', taper:true, days:[
        {day:'Mon', type:'Easy Long',   detail:"10 miles easy — relaxed, don\'t force it",  miles:10},
        {day:'Tue', type:'Rest',        detail:'Full rest',                                 miles:0},
        {day:'Wed', type:'Tune-up',     detail:'5 mi: 1 easy + 2 at MP + 2 easy',          miles:5},
        {day:'Thu', type:'Soccer',      detail:'Consider skipping — judgment call',         miles:0},
        {day:'Fri', type:'Easy Run',    detail:'4 miles easy + 4 strides',                  miles:4},
        {day:'Sat', type:'Rest',        detail:'Full rest',                                 miles:0},
        {day:'Sun', type:'Rest',        detail:'Full rest',                                 miles:0},
      ]},
      { num:23, dates:'Nov 2–8 ★ RACE WEEK', totalMiles:'Race! 🏁', race:true, days:[
        {day:'Mon', type:'Easy Run',    detail:'4 miles easy — keep loose',                 miles:4},
        {day:'Tue', type:'Strides',     detail:'3 miles easy + 4×20 sec strides',           miles:3},
        {day:'Wed', type:'Easy Run',    detail:'2 miles easy',                              miles:2},
        {day:'Thu', type:'Rest',        detail:'Skip soccer — full rest',                   miles:0},
        {day:'Fri', type:'Shake-out',   detail:'2 miles very easy + 4 strides',             miles:2},
        {day:'Sat', type:'Rest',        detail:'Rest, pasta dinner, gear ready, early to bed', miles:0},
        {day:'Sun', type:'Race Day',    detail:'🏁 Harrisburg Marathon — Start 9:10, settle 8:50, give it all after mi 19. You earned this.', miles:26.2},
      ]},
    ],
  },
]

const STRENGTH = [
  {
    name:'Single-Leg Deadlift', sets:'3×10 each', why:'Hamstring + glute strength — #1 injury prevention move',
    steps:[
      'Stand on one foot, slight bend in the standing knee. Hold a light weight in the opposite hand or go bodyweight.',
      'Hinge forward at the hip, letting the free leg extend straight behind you as a counterbalance. Keep your back flat.',
      'Lower until you feel a stretch in the standing leg hamstring — roughly parallel to the floor.',
      'Drive through the standing heel to return upright. Keep hips square throughout. Complete all reps before switching.',
    ]
  },
  {
    name:'Bulgarian Split Squat', sets:'3×10 each', why:'Quad + hip stability, mimics running stride',
    steps:[
      'Stand about 2 feet in front of a chair or couch. Place the top of one foot on the surface behind you.',
      'Lower your back knee toward the floor by bending the front knee. Front shin stays roughly vertical.',
      'Go down until your front thigh is close to parallel with the floor. Don\'t let the front knee cave inward.',
      'Push through the front heel to return. This will feel hard — that\'s correct. Use a wall for balance if needed.',
    ]
  },
  {
    name:'Lateral Band Walks', sets:'3×15 each way', why:'Glute medius — prevents IT band and knee issues',
    steps:[
      'Place a resistance band just above your knees (or around your ankles for more challenge).',
      'Stand with feet hip-width apart, slight bend in the knees, slight forward lean at the hips — athletic stance.',
      'Step sideways with one foot, then follow with the other, keeping tension in the band the whole time.',
      'Take 15 steps in one direction, then 15 back. Keep your torso upright and don\'t let your feet come together.',
    ]
  },
  {
    name:'Glute Bridge', sets:'3×15', why:'Glute activation — directly powers your running',
    steps:[
      'Lie on your back, knees bent, feet flat on the floor hip-width apart. Arms at your sides.',
      'Press through your heels and squeeze your glutes to lift your hips off the floor.',
      'At the top, your body should form a straight line from shoulders to knees. Hold 1–2 sec at the top.',
      'Lower slowly (2–3 sec on the way down). For more challenge, do single-leg: extend one leg straight while bridging on the other.',
    ]
  },
  {
    name:'Single-Leg Calf Raise', sets:'3×15 each', why:'Achilles and lower leg resilience',
    steps:[
      'Stand on one foot near a wall or railing for light balance support — fingertips only, don\'t lean on it.',
      'Lower your heel as far as comfortable (ideally off the edge of a step for full range), then rise up onto your toes as high as you can.',
      'The lowering phase is as important as the rising — go slow on the way down (3 sec).',
      'Complete all reps on one side before switching. If this is easy, add weight by holding a dumbbell.',
    ]
  },
  {
    name:'Step-Ups', sets:'3×12 each', why:'Sport-specific power, simulates hill running',
    steps:[
      'Stand in front of a sturdy chair, bench, or bottom stair. Step one foot up onto the surface.',
      'Drive through the heel of the elevated foot to stand fully upright on top. Don\'t push off the back foot.',
      'Bring the trailing leg up to standing, then step back down with control. That\'s one rep.',
      'Complete all reps on one leg before switching. Hold dumbbells for added challenge.',
    ]
  },
  {
    name:'Dead Bug', sets:'3×10 each side', why:'Core stability without loading hip flexors',
    steps:[
      'Lie on your back, arms pointing straight up toward the ceiling, knees bent at 90° lifted in the air — like a dead bug.',
      'Press your lower back firmly into the floor and keep it there for the entire exercise.',
      'Slowly lower your right arm overhead and your left leg toward the floor simultaneously. Don\'t let your back arch.',
      'Return to start and repeat on the opposite side (left arm + right leg). Move slowly — 3–4 sec each direction.',
    ]
  },
  {
    name:'Copenhagen Plank', sets:'3×20 sec each', why:'Adductor strength — soccer + running synergy',
    steps:[
      'Lie on your side. Place your top foot on a chair or bench. Bottom leg hangs free.',
      'Lift your hips off the ground into a side plank, supporting yourself on your top foot and your forearm.',
      'Hold for 20 sec. Your body should form a straight line. This will feel intense in the inner thigh of the top leg.',
      'For an easier version, place your bottom knee on the floor instead of holding it free. Build toward the full version.',
    ]
  },
]

const STRETCHES = [
  // Every post-run — standing to floor order
  {
    name:'Standing Quad Stretch', time:'45 sec/side', when:'Every run', group:'every',
    steps:[
      'Stand near a wall for balance. Bend one knee and bring your heel toward your glutes.',
      'Grip your ankle (not your foot) with the same-side hand. Keep knees together.',
      'Stand tall — don\'t lean forward or let your hip flare out to the side.',
      'Hold 45 sec, switch sides. If balance is tricky, rest fingertips on a wall.',
    ]
  },
  {
    name:'Calf Stretch — straight + bent knee', time:'45 sec each position/side', when:'Every run — 4 holds total', group:'every',
    steps:[
      'Stand facing a wall, hands on wall. Step one foot back into a lunge stance.',
      'STRAIGHT KNEE: keep the back leg straight, press the heel into the ground. Hold 45 sec. This targets the gastrocnemius (upper calf).',
      'BENT KNEE: keeping the same foot back, slightly bend the back knee while still pressing the heel down. Hold 45 sec. This targets the soleus and Achilles.',
      'Repeat both positions on the other side. 4 holds total.',
    ]
  },
  {
    name:'Hip Flexor Stretch (kneeling)', time:'60 sec/side', when:'Every run', group:'every',
    steps:[
      'Kneel on one knee (pad it if on hard floor). The other foot is flat on the ground in front, knee at 90°.',
      'Tuck your pelvis under slightly — think "zip up" your core. This is what actually stretches the hip flexor.',
      'Shift your hips forward gently until you feel a stretch in the front of the kneeling hip/thigh.',
      'Keep your torso upright. Hold 60 sec, switch sides.',
    ]
  },
  {
    name:'Butterfly Stretch', time:'60–90 sec', when:'Every run', group:'every',
    steps:[
      'Sit on the floor with the soles of your feet together, knees falling out to the sides.',
      'Hold your feet or ankles with both hands. Sit up tall first.',
      'Hinge forward from your hips (not your lower back) — lead with your chest, not your head.',
      'Go only as far as you can without rounding your back. Hold 60–90 sec. Breathe into the inner thigh stretch.',
    ]
  },
  {
    name:'Seated Hamstring Stretch', time:'60 sec/side', when:'Every run', group:'every',
    steps:[
      'Sit on the floor with one leg straight out, the other bent with foot tucked in.',
      'Sit up tall and hinge forward from your hips toward the straight leg — don\'t round your back.',
      'Reach toward your foot. If you can\'t reach it, loop a towel around the foot and hold both ends.',
      'Hold 60 sec, switch sides.',
    ]
  },
  {
    name:'Figure-4 Glute Stretch', time:'60 sec/side', when:'Every run', group:'every',
    steps:[
      'Lie on your back, knees bent, feet flat on the floor.',
      'Cross one ankle over the opposite knee, forming a "4" shape.',
      'Either stay here for a gentle stretch, or lift the bottom foot off the floor and pull both legs toward your chest.',
      'Hold 60 sec. The deeper you pull the legs in, the more intense the stretch. Switch sides.',
    ]
  },
  // Sometimes
  {
    name:'IT Band / TFL (foam roller)', time:'60–90 sec/side', when:'2–3×/week, not before runs', group:'sometimes',
    steps:[
      'Don\'t roll directly on the IT band itself — it\'s a tendon, not a muscle. Target the TFL: the muscle on the outside of your hip, just below the hip bone.',
      'Lie on your side with the foam roller under the outside of your upper thigh/hip area. Support yourself on your forearm.',
      'Slowly roll from just below the hip to just above the knee. Pause on any tender spots for 5–10 sec.',
      'Also roll the quads — lie face down and work the front of the thigh.',
    ]
  },
  {
    name:'Pigeon Pose', time:'90 sec/side', when:'Post-long-run only', group:'sometimes',
    steps:[
      'From a tabletop position, bring one knee forward and place it behind your wrist. Your shin should be at an angle (not fully horizontal at first).',
      'Extend the opposite leg straight back. Square your hips toward the floor as much as possible.',
      'Either stay upright on your hands, or lower your torso down onto your forearms or the floor for a deeper stretch.',
      'Hold 90 sec. This is a deep glute and external hip rotator stretch — don\'t rush it. Switch sides.',
    ]
  },
  {
    name:'Wide-Leg Seated Forward Fold', time:'60–90 sec', when:'Post-long-run or when adductors are tight', group:'sometimes',
    steps:[
      'Sit on the floor with legs spread wide in a V shape. Sit up tall and flex your feet.',
      'Place hands on the floor in front of you. Hinge forward from your hips, walking your hands out.',
      'Keep your back as flat as possible — you\'re trying to fold from the hip crease, not round your spine.',
      'Go only as far as your hips allow. Hold 60–90 sec. Particularly good after runs where your adductors or inner hamstrings felt tight.',
    ]
  },
]

// ─── Type badge colours ───────────────────────────────────────────────────────

const TYPE_STYLE = {
  'Long Run':      { bg:'#052e16', text:'#86efac', border:'#166534' },
  'Easy Run':      { bg:'#0f172a', text:'#94a3b8', border:'#334155' },
  'MP Workout':    { bg:'#0c1a3a', text:'#93c5fd', border:'#1d4ed8' },
  'Strength':      { bg:'#1c0a00', text:'#fdba74', border:'#9a3412' },
  'Strength+Easy': { bg:'#1c0a00', text:'#fdba74', border:'#9a3412' },
  'Easy+Strength': { bg:'#1c0a00', text:'#fdba74', border:'#9a3412' },
  'Soccer':        { bg:'#1a1500', text:'#fde68a', border:'#92400e' },
  'Bike':          { bg:'#120a2a', text:'#d8b4fe', border:'#7e22ce' },
  'Easy/Bike':     { bg:'#120a2a', text:'#d8b4fe', border:'#7e22ce' },
  'Rest':          { bg:'#111827', text:'#475569', border:'#1f2937' },
  'Medium Long':   { bg:'#052e16', text:'#6ee7b7', border:'#065f46' },
  'Easy Long':     { bg:'#052e16', text:'#6ee7b7', border:'#065f46' },
  'Tune-up':       { bg:'#0d0a2a', text:'#a5b4fc', border:'#4338ca' },
  'Strides':       { bg:'#042f2e', text:'#67e8f9', border:'#0e7490' },
  'Shake-out':     { bg:'#042f2e', text:'#67e8f9', border:'#0e7490' },
  'Easy Jog':      { bg:'#0f172a', text:'#94a3b8', border:'#334155' },
  'Race Day':      { bg:'#450a0a', text:'#fde047', border:'#ca8a04' },
}

function badge(type) {
  const s = TYPE_STYLE[type] || { bg:'#1f2937', text:'#9ca3af', border:'#374151' }
  return {
    backgroundColor: s.bg, color: s.text, borderColor: s.border,
    border: '1px solid', borderRadius: 4, fontSize: 11,
    fontFamily: 'var(--font-mono)', padding: '2px 7px',
    whiteSpace: 'nowrap', flexShrink: 0,
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().slice(0,10)
}

function weekKey(dateStr) {
  // Returns YYYY-MM-DD of the Monday that starts the week containing dateStr
  const d = new Date(dateStr + 'T12:00:00') // noon avoids DST edge cases
  const day = d.getDay() // 0=Sun, 1=Mon ... 6=Sat
  const daysToMonday = (day === 0) ? 6 : day - 1
  const monday = new Date(d)
  monday.setDate(d.getDate() - daysToMonday)
  return monday.toISOString().slice(0, 10)
}


const LEG_ROUTINE = [
  {
    name: 'Leg Swings — Forward/Back',
    reps: '15 each side',
    why: 'Loosens hip flexors and hamstrings dynamically before loading them',
    steps: [
      'Stand sideways to a wall, fingertips resting on it for balance.',
      'Swing the outside leg forward and back like a pendulum — loose and relaxed, not forced.',
      'Let the range of motion increase naturally over the 15 swings. Don\'t kick aggressively.',
      'Complete 15 swings, turn around, repeat on the other side.',
    ]
  },
  {
    name: 'Leg Swings — Lateral',
    reps: '15 each side',
    why: 'Opens up the adductors and glutes — especially important given your adductor history',
    steps: [
      'Face the wall, both hands resting on it for balance.',
      'Swing one leg side to side across your body — right to left and back.',
      'Keep your hips facing forward and let the leg swing freely. Don\'t rotate your torso.',
      '15 swings per side. This will feel tighter on the adductor side — that\'s exactly why it\'s here.',
    ]
  },
  {
    name: 'Hip Circles',
    reps: '10 each direction, each side',
    why: 'Wakes up the hip capsule and lubricates the joint before running',
    steps: [
      'Stand on one leg, slight bend in the knee. You can rest a hand on a wall.',
      'Lift the other knee to hip height and draw big slow circles with it — forward, out, back, in.',
      '10 circles forward, then 10 backward on the same side.',
      'Switch legs. Go slow — this is mobility work, not cardio.',
    ]
  },
  {
    name: 'Bodyweight Squats',
    reps: '15 slow reps',
    why: 'Gets blood into quads and glutes, warms up the knee joint',
    steps: [
      'Stand feet shoulder-width apart, toes slightly turned out.',
      'Lower slowly — take 3 seconds on the way down. Knees track over toes, chest stays up.',
      'Go as deep as is comfortable. You don\'t need to hit parallel for a warmup.',
      'Rise back up and squeeze glutes at the top. No bouncing at the bottom.',
    ]
  },
  {
    name: 'Glute Bridges',
    reps: '15 reps',
    why: 'Activates glutes before the run — prevents them from staying asleep on easy miles',
    steps: [
      'Lie on your back, knees bent, feet flat on the floor hip-width apart.',
      'Press through your heels and squeeze your glutes to lift your hips.',
      'Hold 1 second at the top — body forms a straight line from shoulders to knees.',
      'Lower slowly. This is activation, not loading — focus on feeling the glutes fire.',
    ]
  },
  {
    name: 'Lateral Band Walks',
    reps: '10 steps each way',
    why: 'Fires up the glute medius — your knee stabilizer for the miles ahead',
    steps: [
      'Place a resistance band just above your knees. If you don\'t have one, skip this and add it when you get one.',
      'Feet hip-width apart, slight bend in the knees, slight forward lean — athletic stance.',
      'Step sideways keeping tension in the band the whole time. Don\'t let feet come together.',
      '10 steps right, 10 steps left. Keep your torso upright throughout.',
    ]
  },
  {
    name: 'Calf Raises — Both Legs',
    reps: '20 slow reps',
    why: 'Warms up the calves and Achilles before they take load on the run',
    steps: [
      'Stand near a wall for light balance support — fingertips only.',
      'Rise up onto your toes as high as you can, hold 1 second at the top.',
      'Lower slowly — 2-3 seconds on the way down. Full range of motion.',
      'Both legs together here (not single-leg). This is warmup, not the strength version.',
    ]
  },
]

// ─── Auth Gate ────────────────────────────────────────────────────────────────

function AuthGate({ children }) {
  const [user, setUser] = useState(undefined) // undefined = loading

  useEffect(() => {
    const unsub = onAuthChange(u => setUser(u))
    return unsub
  }, [])

  if (user === undefined) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100dvh' }}>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--faint)' }}>loading…</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        minHeight:'100dvh', padding:32, textAlign:'center',
      }}>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--faint)', letterSpacing:'0.12em', marginBottom:12 }}>
          MONTGOMERY COUNTY, PA · NOV 2026
        </div>
        <div style={{ fontFamily:'var(--font-serif)', fontSize:28, fontStyle:'italic', marginBottom:8 }}>
          26.2 Miles to November
        </div>
        <div style={{ fontSize:13, color:'var(--muted)', marginBottom:40, maxWidth:280, lineHeight:1.6 }}>
          Sign in to sync your training log across all devices.
        </div>
        <button onClick={signInWithGoogle}
          style={{
            display:'flex', alignItems:'center', gap:10,
            background:'white', color:'#1a1a1a', border:'none',
            borderRadius:8, padding:'12px 20px', fontSize:14, fontWeight:500,
            cursor:'pointer', fontFamily:'var(--font-sans)',
            boxShadow:'0 2px 8px rgba(0,0,0,0.3)',
          }}>
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
            <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
          </svg>
          Sign in with Google
        </button>
      </div>
    )
  }

  return children(user)
}

// ─── Plan Tab ─────────────────────────────────────────────────────────────────

function PlanTab() {
  const [phaseIdx, setPhaseIdx] = useState(0)
  const [openWeek, setOpenWeek] = useState(null)
  const phase = PHASES[phaseIdx]

  return (
    <div style={{ padding: '0 0 80px' }}>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', padding:'16px 16px 0' }}>
        {PHASES.map((p, i) => (
          <button key={p.id} onClick={() => { setPhaseIdx(i); setOpenWeek(null) }}
            style={{
              padding:'6px 14px', borderRadius:99, fontSize:13,
              fontFamily:'var(--font-mono)',
              background: phaseIdx === i ? p.color : 'var(--surface2)',
              color: phaseIdx === i ? '#0a0f1a' : 'var(--muted)',
              border: phaseIdx === i ? 'none' : '1px solid var(--border2)',
              fontWeight: phaseIdx === i ? 600 : 400,
              transition:'all 0.15s',
            }}>
            {p.months}
          </button>
        ))}
      </div>

      <div style={{
        margin:'16px', padding:'16px', borderRadius:12,
        border:`1px solid ${phase.color}30`, background:`${phase.color}0d`,
      }}>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:phase.color, letterSpacing:'0.1em', marginBottom:4 }}>
          {phase.name}
        </div>
        <div style={{ fontFamily:'var(--font-serif)', fontSize:22, color:'var(--text)', marginBottom:6 }}>
          {phase.subtitle}
        </div>
        <div style={{ fontSize:13, color:'var(--muted)', marginBottom:12, lineHeight:1.6 }}>
          {phase.goal}
        </div>
        {phase.keyFocus.map((f,i) => (
          <div key={i} style={{ display:'flex', gap:8, fontSize:12.5, color:'var(--muted)', marginBottom:5, lineHeight:1.5 }}>
            <span style={{ color:phase.color, flexShrink:0 }}>▸</span>{f}
          </div>
        ))}
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:6, padding:'0 12px' }}>
        {phase.weeks.map((week, wi) => (
          <div key={wi} style={{ borderRadius:10, border:'1px solid var(--border2)', overflow:'hidden' }}>
            <button onClick={() => setOpenWeek(openWeek === wi ? null : wi)}
              style={{
                width:'100%', display:'flex', alignItems:'center',
                padding:'12px 14px', background:'var(--surface)', gap:10, textAlign:'left',
              }}>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--faint)', width:40, flexShrink:0 }}>
                WK {week.num}
              </span>
              <span style={{ fontSize:13.5, color:'var(--text)', flex:1 }}>{week.dates}</span>
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                {week.cutback && <Tag color="#60a5fa">cutback</Tag>}
                {week.peak    && <Tag color="#f87171">peak ★</Tag>}
                {week.taper   && <Tag color="#fbbf24">taper</Tag>}
                {week.race    && <Tag color="#fde047">race!</Tag>}
                <span style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--muted)' }}>
                  {week.totalMiles}
                </span>
                <span style={{ color:'var(--faint)', fontSize:12, marginLeft:4 }}>
                  {openWeek === wi ? '▲' : '▼'}
                </span>
              </div>
            </button>

            {openWeek === wi && (
              <div style={{ borderTop:'1px solid var(--border)' }}>
                {week.days.map((day, di) => (
                  <div key={di} style={{
                    display:'flex', alignItems:'flex-start', gap:10,
                    padding:'10px 14px', background:'var(--bg)',
                    borderBottom: di < week.days.length-1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--faint)', width:30, paddingTop:2, flexShrink:0 }}>
                      {day.day}
                    </span>
                    <span style={badge(day.type)}>{day.type}</span>
                    <span style={{ fontSize:13, color:'var(--muted)', flex:1, paddingTop:2, lineHeight:1.5 }}>
                      {day.detail}
                    </span>
                    {day.miles > 0 && (
                      <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--faint)', paddingTop:2, flexShrink:0 }}>
                        {day.miles}mi
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function Tag({ color, children }) {
  return (
    <span style={{
      fontFamily:'var(--font-mono)', fontSize:10, padding:'2px 7px',
      borderRadius:99, background:`${color}20`, color, border:`1px solid ${color}50`,
    }}>{children}</span>
  )
}

// ─── Tracker Tab ──────────────────────────────────────────────────────────────

function TrackerTab({ user }) {
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ date: today(), miles:'', pace:'', type:'Easy Run', notes:'' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [delConfirm, setDelConfirm] = useState(null)

  // Real-time Firestore listener
  useEffect(() => {
    const runsRef = collection(db, 'users', user.uid, 'runs')
    const q = query(runsRef, orderBy('date', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setRuns(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [user.uid])

  async function handleAdd() {
    if (!form.miles || isNaN(parseFloat(form.miles))) return
    setSaving(true)
    try {
      const runsRef = collection(db, 'users', user.uid, 'runs')
      await addDoc(runsRef, {
        date: form.date,
        miles: parseFloat(form.miles),
        pace: form.pace,
        type: form.type,
        notes: form.notes,
        createdAt: serverTimestamp(),
      })
      setForm(f => ({ ...f, miles:'', pace:'', notes:'' }))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (delConfirm !== id) { setDelConfirm(id); return }
    await deleteDoc(doc(db, 'users', user.uid, 'runs', id))
    setDelConfirm(null)
  }

  const weekMap = {}
  runs.forEach(r => {
    const w = weekKey(r.date)
    weekMap[w] = (weekMap[w] || 0) + r.miles
  })

  const thisWeek = weekKey(today())
  const thisWeekMiles = weekMap[thisWeek] || 0
  const totalMiles = runs.reduce((s,r) => s + r.miles, 0)
  const weeks = Object.keys(weekMap).sort().slice(-8)
  const maxWeekMiles = Math.max(...weeks.map(w => weekMap[w]), 1)

  const RUN_TYPES = ['Easy Run','Long Run','MP Workout','Tune-up','Race','Other']

  return (
    <div style={{ padding:'16px 16px 100px' }}>
      {/* Stats strip */}
      <div style={{ display:'flex', gap:10, marginBottom:20 }}>
        {[
          { label:'This Week', value:`${thisWeekMiles.toFixed(1)} mi` },
          { label:'Total Logged', value:`${totalMiles.toFixed(1)} mi` },
          { label:'Runs Logged', value:runs.length },
        ].map(s => (
          <div key={s.label} style={{
            flex:1, background:'var(--surface)', borderRadius:10,
            border:'1px solid var(--border2)', padding:'12px 10px', textAlign:'center',
          }}>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--faint)', marginBottom:4, letterSpacing:'0.08em' }}>
              {s.label}
            </div>
            <div style={{ fontFamily:'var(--font-serif)', fontSize:20, color:'var(--text)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Weekly bar chart */}
      {weeks.length > 0 && (
        <div style={{ background:'var(--surface)', borderRadius:10, border:'1px solid var(--border2)', padding:'14px', marginBottom:20 }}>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--faint)', marginBottom:12, letterSpacing:'0.08em' }}>
            WEEKLY MILEAGE (last {weeks.length} weeks)
          </div>
          <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:64 }}>
            {weeks.map(w => {
              const mi = weekMap[w]
              const h = Math.max(4, (mi / maxWeekMiles) * 56)
              const isCurrent = w === thisWeek
              return (
                <div key={w} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                  <div style={{ fontSize:9, fontFamily:'var(--font-mono)', color:'var(--faint)' }}>{mi.toFixed(0)}</div>
                  <div style={{
                    width:'100%', height:h, borderRadius:3,
                    background: isCurrent ? '#4ade80' : '#1d4ed8', opacity: isCurrent ? 1 : 0.7,
                  }}/>
                  <div style={{ fontSize:8, fontFamily:'var(--font-mono)', color:'var(--faint)' }}>{w.slice(5).replace(/-/g,'/')}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Log form */}
      <div style={{ background:'var(--surface)', borderRadius:12, border:'1px solid var(--border2)', padding:'16px', marginBottom:20 }}>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--accent)', letterSpacing:'0.1em', marginBottom:14 }}>
          LOG A RUN
        </div>
        <div style={{ display:'flex', gap:10, marginBottom:10 }}>
          <div style={{ flex:'0 0 58%' }}>
            <Label>Date</Label>
            <Input type="date" value={form.date} onChange={e => setForm(f=>({...f,date:e.target.value}))} />
          </div>
          <div style={{ flex:'1 1 auto' }}>
            <Label>Miles</Label>
            <Input type="number" step="0.1" placeholder="0.0" value={form.miles}
              onChange={e => setForm(f=>({...f,miles:e.target.value}))} />
          </div>
        </div>
        <div style={{ display:'flex', gap:10, marginBottom:10 }}>
          <div style={{ flex:1 }}>
            <Label>Avg Pace (min/mi)</Label>
            <Input placeholder="e.g. 10:30" value={form.pace} onChange={e => setForm(f=>({...f,pace:e.target.value}))} />
          </div>
          <div style={{ flex:1 }}>
            <Label>Type</Label>
            <select value={form.type} onChange={e => setForm(f=>({...f,type:e.target.value}))}
              style={{
                width:'100%', background:'var(--bg)', color:'var(--text)',
                border:'1px solid var(--border2)', borderRadius:6,
                padding:'9px 10px', fontSize:16, fontFamily:'var(--font-sans)',
              }}>
              {RUN_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom:12 }}>
          <Label>Notes (optional)</Label>
          <Input placeholder="How'd it go?" value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} />
        </div>
        <button onClick={handleAdd} disabled={saving}
          style={{
            width:'100%', padding:'11px', borderRadius:8,
            background: saved ? '#166534' : '#4ade80',
            color:'#0a0f1a', fontWeight:600, fontSize:14,
            fontFamily:'var(--font-mono)', letterSpacing:'0.05em',
            transition:'background 0.2s', opacity: saving ? 0.7 : 1,
          }}>
          {saved ? '✓ Saved' : saving ? 'Saving…' : '+ Log Run'}
        </button>
      </div>

      {/* History */}
      {loading && (
        <div style={{ textAlign:'center', color:'var(--faint)', fontSize:13, fontStyle:'italic' }}>Loading runs…</div>
      )}
      {!loading && runs.length > 0 && (
        <div>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--faint)', letterSpacing:'0.1em', marginBottom:10 }}>
            RUN HISTORY
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {runs.map(r => (
              <div key={r.id} style={{
                background:'var(--surface)', borderRadius:10,
                border:'1px solid var(--border2)', padding:'12px 14px',
                display:'flex', alignItems:'flex-start', gap:10,
              }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--faint)' }}>{r.date}</span>
                    <span style={badge(r.type)}>{r.type}</span>
                  </div>
                  <div style={{ display:'flex', gap:14 }}>
                    <span style={{ fontFamily:'var(--font-serif)', fontSize:20, color:'var(--text)' }}>{r.miles} mi</span>
                    {r.pace && (
                      <span style={{ fontFamily:'var(--font-mono)', fontSize:13, color:'var(--muted)', paddingTop:4 }}>
                        {r.pace}/mi
                      </span>
                    )}
                  </div>
                  {r.notes && (
                    <div style={{ fontSize:12, color:'var(--faint)', marginTop:4, fontStyle:'italic' }}>{r.notes}</div>
                  )}
                </div>
                <button onClick={() => handleDelete(r.id)}
                  style={{
                    fontSize:11, fontFamily:'var(--font-mono)', padding:'4px 8px', borderRadius:5,
                    color: delConfirm === r.id ? '#f87171' : 'var(--faint)',
                    border:`1px solid ${delConfirm === r.id ? '#f87171' : 'var(--border2)'}`,
                    background:'transparent',
                  }}>
                  {delConfirm === r.id ? 'sure?' : 'del'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {!loading && runs.length === 0 && (
        <div style={{ textAlign:'center', color:'var(--faint)', fontSize:13, marginTop:20, fontStyle:'italic' }}>
          No runs logged yet. Log your first run above.
        </div>
      )}
    </div>
  )
}

function Input({ type='text', ...props }) {
  return (
    <input type={type} {...props} style={{
      width:'100%', minWidth:0, boxSizing:'border-box',
      background:'var(--bg)', color:'var(--text)',
      border:'1px solid var(--border2)', borderRadius:6,
      padding:'9px 10px', fontSize:16, fontFamily:'var(--font-sans)', outline:'none',
    }} />
  )
}

// ─── Strength Tab ─────────────────────────────────────────────────────

function StrengthTab() {
  const [expanded, setExpanded] = useState(null)
  return (
    <div style={{ padding:'16px 16px 100px' }}>
      <div style={{ background:'var(--surface)', borderRadius:12, border:'1px solid var(--border2)', padding:'16px', marginBottom:20 }}>
        <div style={{ fontFamily:'var(--font-serif)', fontSize:20, marginBottom:8 }}>The 20–30 Min Routine</div>
        <div style={{ fontSize:13, color:'var(--muted)', lineHeight:1.7, marginBottom:12 }}>
          This is the non-negotiable part of the plan. Every injury traces back to skipping this.
          Twice a week through October, once a week in the taper. No gym needed.
          <span style={{ color:'var(--accent)', fontFamily:'var(--font-mono)', fontSize:11, display:'block', marginTop:8 }}>
            TAP ANY EXERCISE FOR INSTRUCTIONS
          </span>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {[
            { label:'Jun–Aug', val:'2×/week, ~25 min', color:'#4ade80' },
            { label:'Sep–Oct', val:'2×/week, ~30 min', color:'#fb923c' },
            { label:'Taper',   val:'1×/week, 15 min light', color:'#fbbf24' },
          ].map(r => (
            <div key={r.label} style={{ display:'flex', gap:8, fontSize:12 }}>
              <span style={{ color:r.color, fontFamily:'var(--font-mono)', width:60, flexShrink:0 }}>{r.label}</span>
              <span style={{ color:'var(--muted)' }}>{r.val}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {STRENGTH.map((ex, i) => {
          const open = expanded === i
          return (
            <div key={i} style={{
              background:'var(--surface)', borderRadius:10,
              border: open ? '1px solid #9a3412' : '1px solid var(--border2)',
              overflow:'hidden', transition:'border-color 0.2s',
            }}>
              <button onClick={() => setExpanded(open ? null : i)}
                style={{ width:'100%', display:'flex', gap:12, padding:'14px', textAlign:'left', background:'transparent' }}>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:18, color:'#fb923c', width:30, flexShrink:0, paddingTop:2 }}>
                  {String(i+1).padStart(2,'0')}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:500, fontSize:14, marginBottom:3 }}>{ex.name}</div>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'#fb923c', marginBottom:5 }}>{ex.sets}</div>
                  <div style={{ fontSize:12, color:'var(--muted)', lineHeight:1.5 }}>{ex.why}</div>
                </div>
                <div style={{ color:'var(--faint)', fontSize:12, paddingTop:2, flexShrink:0 }}>{open ? '▲' : '▼'}</div>
              </button>
              {open && (
                <div style={{ borderTop:'1px solid #2d1a0a', padding:'12px 14px 14px', background:'#120800' }}>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'#fb923c', letterSpacing:'0.1em', marginBottom:10 }}>HOW TO DO IT</div>
                  {ex.steps.map((step, si) => (
                    <div key={si} style={{ display:'flex', gap:10, marginBottom:9 }}>
                      <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'#fb923c', flexShrink:0, width:18 }}>{si+1}.</span>
                      <span style={{ fontSize:13, color:'#d1c4b8', lineHeight:1.6 }}>{step}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modulation note */}
      <div style={{ marginTop:20, background:'var(--surface)', borderRadius:12, border:'1px solid var(--border2)', padding:'16px' }}>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'#fb923c', letterSpacing:'0.1em', marginBottom:12 }}>HOW TO USE THE TIME TARGETS</div>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <div style={{ marginBottom:5 }}><span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'#4ade80' }}>Jun–Aug · ~25 min</span></div>
            <div style={{ fontSize:12, color:'var(--muted)', lineHeight:1.7 }}>
              Do all 8 exercises in order, 2 sets each instead of 3. Rest ~45 sec between sets.
              Goal is building the movement patterns and waking up muscles that haven’t been loaded in a while.
              Effort should feel easy–moderate — you should finish without feeling trashed.
            </div>
          </div>
          <div style={{ borderTop:'1px solid var(--border)', paddingTop:14 }}>
            <div style={{ marginBottom:5 }}><span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'#fb923c' }}>Sep–Oct · ~30 min</span></div>
            <div style={{ fontSize:12, color:'var(--muted)', lineHeight:1.7 }}>
              Full 3 sets on all 8 exercises. Rest ~45–60 sec between sets.
              By now the movements feel familiar — focus on quality and single-leg stability.
              The extra time comes from the third set, not from going slower.
              Do this on a non-running day or after an easy run, never before a long run or MP workout.
            </div>
          </div>
          <div style={{ borderTop:'1px solid var(--border)', paddingTop:14 }}>
            <div style={{ marginBottom:5 }}><span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'#fbbf24' }}>Taper · ~15 min</span></div>
            <div style={{ fontSize:12, color:'var(--muted)', lineHeight:1.7 }}>
              Drop to 2 sets, skip exercises 1–2 (the hardest ones). Focus on exercises 3–8 only —
              band walks, bridges, calf raises, step-ups, dead bugs, Copenhagen planks.
              Lighter, shorter, just enough to keep the muscles firing. Stop well short of fatigue.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Stretch Tab ─────────────────────────────────────────────────────

function StretchTab() {
  const [expanded, setExpanded] = useState(null)
  const everyStretches = STRETCHES.filter(s => s.group === 'every')
  const someStretches  = STRETCHES.filter(s => s.group === 'sometimes')

  function StretchCard({ s, i, accentColor, borderColor, bgColor }) {
    const open = expanded === s.name
    return (
      <div style={{
        background:'var(--surface)', borderRadius:10,
        border: open ? `1px solid ${borderColor}` : '1px solid var(--border2)',
        overflow:'hidden', transition:'border-color 0.2s',
      }}>
        <button onClick={() => setExpanded(open ? null : s.name)}
          style={{ width:'100%', display:'flex', gap:12, padding:'14px', textAlign:'left', background:'transparent', alignItems:'flex-start' }}>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:18, color:accentColor, width:30, flexShrink:0, paddingTop:2 }}>
            {String(i+1).padStart(2,'00')}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:500, fontSize:14, marginBottom:5 }}>{s.name}</div>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:accentColor }}>{s.time}</span>
              <span style={{ fontSize:12, color:'var(--faint)' }}>{s.when}</span>
            </div>
          </div>
          <div style={{ color:'var(--faint)', fontSize:12, paddingTop:2, flexShrink:0 }}>{open ? '▲' : '▼'}</div>
        </button>
        {open && (
          <div style={{ borderTop:`1px solid ${borderColor}40`, padding:'12px 14px 14px', background:bgColor }}>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:accentColor, letterSpacing:'0.1em', marginBottom:10 }}>HOW TO DO IT</div>
            {s.steps.map((step, si) => (
              <div key={si} style={{ display:'flex', gap:10, marginBottom:9 }}>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:accentColor, flexShrink:0, width:18 }}>{si+1}.</span>
                <span style={{ fontSize:13, color:'#d1c4b8', lineHeight:1.6 }}>{step}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ padding:'16px 16px 100px' }}>
      <div style={{ background:'var(--surface)', borderRadius:12, border:'1px solid var(--border2)', padding:'16px', marginBottom:20 }}>
        <div style={{ fontFamily:'var(--font-serif)', fontSize:20, marginBottom:8 }}>Every Run, No Exceptions</div>
        <div style={{ fontSize:13, color:'var(--muted)', lineHeight:1.7 }}>
          Ten minutes after every run, five minutes before. Pre-run is dynamic movement.
          Post-run is static holds. Don’t negotiate with yourself on this one.
          <span style={{ color:'var(--accent)', fontFamily:'var(--font-mono)', fontSize:11, display:'block', marginTop:8 }}>
            TAP ANY STRETCH FOR INSTRUCTIONS
          </span>
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'#4ade80', letterSpacing:'0.1em', padding:'4px 2px' }}>EVERY POST-RUN</div>
        {everyStretches.map((s, i) => (
          <StretchCard key={s.name} s={s} i={i} accentColor='#4ade80' borderColor='#166534' bgColor='#031a0a' />
        ))}
        <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'#fb923c', letterSpacing:'0.1em', padding:'8px 2px 4px' }}>SOMETIMES</div>
        {someStretches.map((s, i) => (
          <StretchCard key={s.name} s={s} i={i} accentColor='#fb923c' borderColor='#9a3412' bgColor='#120800' />
        ))}
      </div>
    </div>
  )
}

// ─── Leg Routine Tab ─────────────────────────────────────────────────

function LegRoutineTab() {
  const [expanded, setExpanded] = useState(null)
  return (
    <div style={{ padding:'16px 16px 100px' }}>
      <div style={{ background:'var(--surface)', borderRadius:12, border:'1px solid var(--border2)', padding:'16px', marginBottom:20 }}>
        <div style={{ fontFamily:'var(--font-serif)', fontSize:20, marginBottom:8 }}>The 10-Minute Leg Routine</div>
        <div style={{ fontSize:13, color:'var(--muted)', lineHeight:1.7, marginBottom:10 }}>
          Do this before every run as your dynamic warmup. Not the same as the strength session —
          this is activation and mobility, not loading. Takes about 10 minutes done in order.
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {[
            { label:'Before runs', val:'Full routine, every time', color:'#22d3ee' },
            { label:'Rest days',   val:'Optional — helps flush soreness', color:'#94a3b8' },
          ].map(r => (
            <div key={r.label} style={{ display:'flex', gap:8, fontSize:12 }}>
              <span style={{ color:r.color, fontFamily:'var(--font-mono)', width:80, flexShrink:0 }}>{r.label}</span>
              <span style={{ color:'var(--muted)' }}>{r.val}</span>
            </div>
          ))}
        </div>
        <div style={{ color:'var(--accent)', fontFamily:'var(--font-mono)', fontSize:11, marginTop:10 }}>
          TAP ANY EXERCISE FOR INSTRUCTIONS
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {LEG_ROUTINE.map((ex, i) => {
          const open = expanded === i
          return (
            <div key={i} style={{
              background:'var(--surface)', borderRadius:10,
              border: open ? '1px solid #0e7490' : '1px solid var(--border2)',
              overflow:'hidden', transition:'border-color 0.2s',
            }}>
              <button onClick={() => setExpanded(open ? null : i)}
                style={{ width:'100%', display:'flex', gap:12, padding:'14px', textAlign:'left', background:'transparent' }}>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:18, color:'#22d3ee', width:30, flexShrink:0, paddingTop:2 }}>
                  {String(i+1).padStart(2,'0')}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:500, fontSize:14, marginBottom:3 }}>{ex.name}</div>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'#22d3ee', marginBottom:4 }}>{ex.reps}</div>
                  <div style={{ fontSize:12, color:'var(--muted)', lineHeight:1.5 }}>{ex.why}</div>
                </div>
                <div style={{ color:'var(--faint)', fontSize:12, paddingTop:2, flexShrink:0 }}>{open ? '▲' : '▼'}</div>
              </button>
              {open && (
                <div style={{ borderTop:'1px solid #0e749030', padding:'12px 14px 14px', background:'#020f12' }}>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'#22d3ee', letterSpacing:'0.1em', marginBottom:10 }}>HOW TO DO IT</div>
                  {ex.steps.map((step, si) => (
                    <div key={si} style={{ display:'flex', gap:10, marginBottom:9 }}>
                      <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'#22d3ee', flexShrink:0, width:18 }}>{si+1}.</span>
                      <span style={{ fontSize:13, color:'#d1c4b8', lineHeight:1.6 }}>{step}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ marginTop:20, background:'var(--surface)', borderRadius:12, border:'1px solid var(--border2)', padding:'16px' }}>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'#22d3ee', letterSpacing:'0.1em', marginBottom:10 }}>
          HOW THIS DIFFERS FROM THE STRENGTH SESSION
        </div>
        <div style={{ fontSize:12, color:'var(--muted)', lineHeight:1.8 }}>
          The strength session (Mon/Wed) loads your muscles to build them stronger over time — sets, reps, real effort, next-day soreness is normal.
          This routine activates muscles that are about to work, lubricates joints, and raises your body temperature before running. No sets, no heavy loading, no single-leg deadlifts.
          If you do the strength session and then go for a run, do this routine between them as your transition warmup.
        </div>
      </div>
    </div>
  )
}

// ─── App Shell ────────────────────────────────────────────────────────────────

const TABS = [
  { id:'plan',     label:'Plan',     icon:'📋' },
  { id:'tracker',  label:'Tracker',  icon:'📍' },
  { id:'legs',     label:'Legs',     icon:'🦵' },
  { id:'strength', label:'Strength', icon:'💪' },
  { id:'stretch',  label:'Stretch',  icon:'🧘' },
]

export default function App() {
  const [tab, setTab] = useState('plan')

  return (
    <AuthGate>
      {user => (
        <div style={{ maxWidth:600, margin:'0 auto', minHeight:'100dvh', position:'relative' }}>
          {/* Header */}
          <div style={{
            background:'var(--surface)', borderBottom:'1px solid var(--border)',
            padding:'12px 16px 10px',
            position:'sticky', top:0, zIndex:20,
            display:'flex', alignItems:'center', justifyContent:'space-between',
          }}>
            <div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--faint)', letterSpacing:'0.12em', marginBottom:1 }}>
                MONTGOMERY COUNTY, PA · NOV 2026
              </div>
              <div style={{ fontFamily:'var(--font-serif)', fontSize:20, color:'var(--text)', fontStyle:'italic' }}>
                26.2 Miles to November
              </div>
              <div style={{ fontSize:11, color:'var(--faint)', marginTop:1 }}>
                Target 3:50–3:55 · ~8:45/mi · 24 weeks
              </div>
            </div>
            <button onClick={signOutUser}
              style={{
                fontFamily:'var(--font-mono)', fontSize:10, color:'var(--faint)',
                border:'1px solid var(--border2)', borderRadius:5, padding:'5px 9px',
                background:'transparent', letterSpacing:'0.05em', flexShrink:0,
              }}>
              sign out
            </button>
          </div>

          {/* Content */}
          <div>
            {tab === 'plan'     && <PlanTab />}
            {tab === 'tracker'  && <TrackerTab user={user} />}
            {tab === 'legs'     && <LegRoutineTab />}
            {tab === 'strength' && <StrengthTab />}
            {tab === 'stretch'  && <StretchTab />}
          </div>

          {/* Bottom nav */}
          <nav style={{
            position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)',
            width:'100%', maxWidth:600,
            background:'var(--surface)', borderTop:'1px solid var(--border)',
            display:'flex', paddingBottom:'env(safe-area-inset-bottom)', zIndex:30,
          }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{
                  flex:1, padding:'10px 4px 8px', display:'flex', flexDirection:'column',
                  alignItems:'center', gap:3,
                  color: tab === t.id ? '#4ade80' : 'var(--faint)',
                  borderBottom: tab === t.id ? '2px solid #4ade80' : '2px solid transparent',
                  transition:'color 0.15s',
                }}>
                <span style={{ fontSize:18 }}>{t.icon}</span>
                <span style={{ fontSize:10, fontFamily:'var(--font-mono)', letterSpacing:'0.08em' }}>{t.label}</span>
              </button>
            ))}
          </nav>
        </div>
      )}
    </AuthGate>
  )
}