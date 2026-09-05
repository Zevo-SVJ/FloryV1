-- The ten phases, and one demo lesson to prove the engine runs.
--
-- The phases are real and permanent: the same keys as `src/lib/lock/phases.ts`,
-- which is what ARCHITECTURE.md promised this migration would be — a seed, not
-- a rewrite. Anything already written against those keys keeps working.
--
-- Everything below the phases is scaffolding, flagged `is_demo`. It exists so
-- that the renderer, the interactive blocks, grading, prerequisites and
-- completion can be exercised end to end before the curriculum exists. Prompt 7
-- writes the real content; this row goes out with one statement:
--
--   delete from public.lessons where is_demo;

insert into public.phases (key, position, label, summary) values
  ('think',     1,  'Think',     'Find a problem worth solving, and decide it is yours.'),
  ('research',  2,  'Research',  'Learn the market, the alternatives and the people in it.'),
  ('validate',  3,  'Validate',  'Get evidence before you get a codebase.'),
  ('product',   4,  'Product',   'Turn a validated problem into a defined product.'),
  ('design',    5,  'Design',    'Decide how it looks, reads and behaves.'),
  ('build',     6,  'Build',     'Direct the execution layer and ship real software.'),
  ('test',      7,  'Test',      'Verify it works, and prove it rather than assume it.'),
  ('ship',      8,  'Ship',      'Put it in front of real people, in production.'),
  ('monetize',  9,  'Monetize',  'Charge for it, and understand why somebody pays.'),
  ('grow',      10, 'Grow',      'Find the channel that works and run it.')
on conflict (key) do nothing;

-- ── The demo module and its two lessons ─────────────────────────────────────

insert into public.modules (id, phase_key, slug, title, summary, position, published)
values (
  '00000000-0000-4000-8000-000000000001',
  'think',
  'demo-module',
  'How LOCK teaches',
  'A working demonstration of the learning engine. Replaced when the curriculum arrives.',
  1,
  true
) on conflict (slug) do nothing;

-- Lesson one: the full block vocabulary, completed by making a decision.
insert into public.lessons (
  id, module_id, slug, title, summary, type, difficulty, estimated_minutes,
  objectives, completion_rule, position, published, is_demo, blocks
) values (
  '00000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000000001',
  'how-lock-teaches',
  'How LOCK teaches',
  'Every kind of block the engine can render, and the learning loop they exist to serve.',
  'concept',
  'foundational',
  8,
  array[
    'Recognise the learning loop LOCK is built around',
    'Know what each kind of lesson block is for'
  ],
  'decision',
  1,
  true,
  true,
  $json$[
    {"kind":"callout","id":"why","tone":"why","title":"Why this matters",
     "text":"A technically impressive SaaS with no validated demand is still a bad business. LOCK is built to stop you writing code before you have earned the right to."},
    {"kind":"text","id":"intro",
     "text":"Reading is the cheapest part of learning and the least durable. LOCK is built around a loop instead: learn, understand, decide, apply, verify, reflect. Every lesson type below exists to push you around that loop rather than through a page."},
    {"kind":"heading","id":"h1","level":2,"text":"You will be asked to decide"},
    {"kind":"your_move","id":"move-1",
     "prompt":"You have three SaaS ideas and a free weekend. Which do you research first, and what makes it the one?",
     "reveal":"LOCK looks for the idea where you can reach ten real users this week. Not the biggest market, not the one you find most interesting — the one you can get evidence about fastest. Evidence beats conviction, and speed of evidence is the only advantage a solo founder reliably has."},
    {"kind":"predict","id":"predict-1",
     "situation":"A landing page gets 10,000 visitors in a month. 40 people start the signup form. 3 finish it.",
     "prompt":"Where is the problem, and how would you find out?",
     "reveal":"Two different failures are stacked here and they need different fixes. 40 starts from 10,000 visitors is a positioning problem — the page is not convincing the right people, or is attracting the wrong ones. 3 finishes from 40 starts is a form problem, and it is the cheaper one to fix first: watch a session recording before you rewrite a word of copy."},
    {"kind":"heading","id":"h2","level":2,"text":"You will be shown real things"},
    {"kind":"comparison","id":"cmp-1","title":"Two ways to describe the same product",
     "left":{"label":"Feature-led","points":["AI-powered analytics","Real-time dashboards","Custom integrations"]},
     "right":{"label":"Problem-led","points":["Know which customers are about to churn","Before your Monday meeting","Without exporting a CSV"]}},
    {"kind":"code","id":"code-1","language":"sql","filename":"supabase/migrations/…_learning_system.sql",
     "code":"create policy \"progress is yours, and readable by staff\"\n  on public.learner_lesson_progress\n  for select to authenticated\n  using ((select auth.uid()) = profile_id or public.is_staff());"},
    {"kind":"prompt","id":"prompt-1","title":"Prompt: pressure-test an idea",
     "prompt":"Here is my SaaS idea: [idea]. Argue against it. Who already solves this, what would make a buyer stay with them, and what would have to be true for me to win? Do not reassure me.",
     "why":"An execution layer that agrees with you is worth nothing at this stage. Asking for the strongest case against is how you find the assumption you have not tested."},
    {"kind":"checklist","id":"check-1","title":"Before you write any code",
     "items":["You can name the person with the problem","You have spoken to five of them","You know what they use today","You know what they pay for it"]},
    {"kind":"callout","id":"real","tone":"real_world","title":"Real world",
     "text":"You will use this the first time you have to decide whether your own idea deserves a codebase. That decision costs weeks if you get it wrong."},
    {"kind":"heading","id":"h3","level":2,"text":"You will be checked"},
    {"kind":"choice","id":"q-1","question":"What does LOCK optimise for?",
     "multiple":false,
     "options":[
       {"id":"a","label":"Completing every lesson"},
       {"id":"b","label":"Becoming able to build independently"},
       {"id":"c","label":"Collecting points and badges"}],
     "correct":["b"],
     "explanation":"Completion is a proxy that is easy to game and easy to fake. The only outcome that counts is whether you can do the work without the platform."},
    {"kind":"decision","id":"decide-1",
     "situation":"You have validated a problem and can build a rough version in a weekend, or a polished one in a month. A competitor is rumoured to be launching something similar in six weeks.",
     "options":[
       {"id":"rough","label":"Ship the rough version this weekend","tradeoff":"You learn from real users in days, and risk a first impression you cannot retake."},
       {"id":"polished","label":"Build the polished version","tradeoff":"You look credible on day one, and you spend a month on assumptions nobody has confirmed."},
       {"id":"neither","label":"Keep interviewing users instead","tradeoff":"Cheapest of the three, and at some point more research is avoidance."}],
     "recommended":"rough",
     "explanation":"Ship the rough version, to a small and chosen audience. The competitor is not the reason — the reason is that a month of building on unconfirmed assumptions is a month you cannot get back, and a first impression can be retaken with people who were never your market."},
    {"kind":"reflection","id":"reflect-1",
     "prompt":"Which of the two exercises above did you actually stop and answer before reading the reveal? What does that tell you about how you learn?"}
  ]$json$::jsonb
) on conflict (slug) do nothing;

-- Lesson two: locked behind lesson one, so prerequisites can be seen working.
insert into public.lessons (
  id, module_id, slug, title, summary, type, difficulty, estimated_minutes,
  objectives, completion_rule, position, published, is_demo, blocks
) values (
  '00000000-0000-4000-8000-000000000011',
  '00000000-0000-4000-8000-000000000001',
  'reading-a-teardown',
  'Reading a teardown',
  'A short check that the prerequisite and knowledge-check machinery works.',
  'teardown',
  'foundational',
  4,
  array['Practise judging a product by its positioning rather than its features'],
  'knowledge_check',
  2,
  true,
  true,
  $json$[
    {"kind":"text","id":"t1",
     "text":"This lesson is locked until the first one is complete. That is the prerequisite system, and it exists so nobody lands in advanced material without the ground under it."},
    {"kind":"boolean","id":"q-tf",
     "question":"A lesson counts as complete once you have scrolled to the bottom.",
     "correct":["false"],
     "explanation":"Completion depends on the lesson's own rule — a decision, a passed check, a reflection — and it is decided in the database, not by the page."}
  ]$json$::jsonb
) on conflict (slug) do nothing;

insert into public.lesson_prerequisites (lesson_id, requires_lesson_id)
values ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000010')
on conflict do nothing;

insert into public.lesson_resources (lesson_id, kind, title, url, source, duration_seconds, why, position)
values (
  '00000000-0000-4000-8000-000000000010',
  'video',
  'How to talk to users without leading them',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'Demo resource',
  720,
  'Placeholder resource, present so the engine can render an external reference with its reason attached. Replaced with real material in Prompt 7.',
  0
) on conflict do nothing;
