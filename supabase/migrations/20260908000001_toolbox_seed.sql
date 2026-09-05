-- A small, real Toolbox.
--
-- Nineteen items rather than two hundred, and that is the product decision the
-- brief asks for: five excellent resources beat fifty links, and a library
-- nobody can navigate is a library nobody opens. Each one answers what it is,
-- why it matters, when to use it and what it should produce.
--
-- The prompts in particular are written the way the brief demands — context,
-- objective, constraints, inputs, expected output, verification — rather than
-- "you are an expert, build me an amazing SaaS". The point is to teach how to
-- direct an execution layer, not to hand somebody a list of incantations.
--
-- Flagged `is_demo` where the content is scaffolding rather than curriculum;
-- the prompts, frameworks and stack notes are real and meant to survive.

-- ── PROMPTS ─────────────────────────────────────────────────────────────────

insert into public.toolbox_items (kind, slug, title, summary, phase_key, tags, position, published, body) values
('prompt', 'pressure-test-an-idea', 'Pressure-test an idea',
 'Makes an execution layer argue against your idea instead of agreeing with it.',
 'think', '{idea,validation,critique}', 1, true,
 $json${
   "whatItDoes": "Turns the model into the sharpest sceptic in the room. It produces the strongest case against your idea, the competitors you have not thought about, and the one assumption that would sink it.",
   "whenToUse": "Before you commit a weekend, and again before you commit a month. Not after you have built something — by then you will defend it.",
   "prompt": "CONTEXT\nI am considering building a SaaS product.\n\nIdea: [IDEA]\nWho I think has the problem: [IDEAL_USER]\nWhat I think they do today: [CURRENT_ALTERNATIVE]\n\nOBJECTIVE\nArgue against this idea as forcefully as the evidence allows.\n\nCONSTRAINTS\n- Do not reassure me and do not balance the criticism with praise.\n- Assume I will build it anyway, so vagueness costs me money.\n- Where you are uncertain, say so rather than inventing a market figure.\n\nPRODUCE\n1. The three strongest reasons this fails.\n2. Who already solves it, and what would make a buyer stay with them.\n3. The single assumption that, if false, makes the whole idea worthless.\n4. The cheapest test of that assumption I could run this week.\n\nVERIFY\nFor each claim, say whether it is something you know, something you inferred, or something I would have to check.",
   "howToUse": "Replace the bracketed inputs with your own words, not with polished marketing copy. Paste the whole thing — the CONSTRAINTS and VERIFY sections are what stop the answer being a compliment.",
   "expectedOutput": "A short, uncomfortable list. If it reads encouraging, your inputs were too vague to attack.",
   "commonMistake": "Describing the solution instead of the problem. A model asked to critique a feature will critique the feature; asked to critique a belief about people, it will find the belief.",
   "variables": [
     {"token": "[IDEA]", "description": "One sentence, in the words somebody with the problem would use."},
     {"token": "[IDEAL_USER]", "description": "A person or a role. Not a market segment."},
     {"token": "[CURRENT_ALTERNATIVE]", "description": "The spreadsheet, the agency, or the doing-nothing they use today."}
   ]
 }$json$::jsonb),

('prompt', 'plan-before-you-build', 'Plan before you build',
 'Gets a technical plan out of an execution layer before it writes a line of code.',
 'build', '{claude-code,planning,architecture}', 2, true,
 $json${
   "whatItDoes": "Forces the plan to exist as text you can argue with, before it exists as code you have to unpick. It produces the approach, the files it will touch, the risks, and what it is choosing not to do.",
   "whenToUse": "At the start of any change bigger than a single file. The larger the change, the more this saves.",
   "prompt": "CONTEXT\nCodebase: [STACK]\nWhat exists today: [CURRENT_STATE]\nWhat I want: [GOAL]\nConstraints: [CONSTRAINTS]\n\nOBJECTIVE\nProduce a plan I can approve or reject. Do not write implementation code yet.\n\nPRODUCE\n1. The approach in five sentences, and one alternative you rejected with the reason.\n2. Every file you would create or change, and what changes in each.\n3. What could break that I would not notice immediately.\n4. What you are deliberately not doing, and why.\n5. How I verify it works — the exact commands, and what passing looks like.\n\nVERIFY\nName anything in CONTEXT that is ambiguous, and say what you assumed. Do not fill a gap silently.",
   "howToUse": "Read point 4 first. What a plan leaves out tells you more about whether it understood the job than what it includes. Approve the plan explicitly before asking for code.",
   "expectedOutput": "A plan short enough to read in two minutes and specific enough to disagree with.",
   "commonMistake": "Accepting a plan you skimmed. An unread plan is worse than none — it feels like diligence and buys nothing.",
   "variables": [
     {"token": "[STACK]", "description": "Framework, language, database. Two lines."},
     {"token": "[CURRENT_STATE]", "description": "What the relevant code does now."},
     {"token": "[GOAL]", "description": "The outcome, not the implementation you imagine."},
     {"token": "[CONSTRAINTS]", "description": "What must not change. Existing APIs, data, deadlines."}
   ]
 }$json$::jsonb),

('prompt', 'interview-without-leading', 'Interview without leading',
 'Turns a research plan into questions that do not tell the person what to say.',
 'research', '{research,interviews,users}', 3, true,
 $json${
   "whatItDoes": "Produces interview questions about what somebody has actually done, rather than what they would hypothetically pay for. Past behaviour is evidence; stated intention is politeness.",
   "whenToUse": "Before every round of user conversations, including the ones you think you can improvise.",
   "prompt": "CONTEXT\nI believe this problem exists: [PROBLEM]\nI am talking to: [WHO]\nI want to learn whether: [ASSUMPTION]\n\nOBJECTIVE\nWrite ten questions that test the assumption without revealing it.\n\nCONSTRAINTS\n- Every question asks about something that already happened, not about a hypothetical.\n- No question mentions my idea, my product, or any solution.\n- No question can be answered yes or no.\n- Flag any question that a polite person would answer falsely to be encouraging.\n\nPRODUCE\n1. Ten questions, ordered from broad to specific.\n2. For each, the answer that would disprove my assumption.\n3. Three follow-ups for when somebody gives a vague answer.\n\nVERIFY\nList any question that leaks what I am hoping to hear, and rewrite it.",
   "howToUse": "Ask the questions in order and resist explaining your idea, even when asked. The moment you describe the product, the interview becomes a demo and the data is gone.",
   "expectedOutput": "Questions about last week, not about next year.",
   "commonMistake": "Asking \"would you pay for this?\". Everybody says yes and nobody pays.",
   "variables": [
     {"token": "[PROBLEM]", "description": "The problem as you currently believe it."},
     {"token": "[WHO]", "description": "The specific role you are speaking to."},
     {"token": "[ASSUMPTION]", "description": "The belief you are trying to break."}
   ]
 }$json$::jsonb);

-- ── FRAMEWORKS ──────────────────────────────────────────────────────────────

insert into public.toolbox_items (kind, slug, title, summary, phase_key, tags, position, published, body) values
('framework', 'problem-user-evidence', 'Problem → User → Evidence',
 'The order the first three phases have to happen in, and why skipping one is expensive.',
 'think', '{validation,evidence,method}', 1, true,
 $json${
   "purpose": "Stops you building for a market instead of a person, and stops you trusting conviction where evidence belongs.",
   "explanation": "Each step is the input to the next. A problem with no named user cannot be researched. A user with no evidence is a guess wearing a job title. Reversing the order — building a solution and looking for a problem it fits — is the single most common way a technically capable founder wastes a year.",
   "flow": ["Problem", "User", "Evidence", "Solution", "Product"],
   "steps": [
     {"label": "Problem", "detail": "State it specifically enough that somebody could tell you it is wrong."},
     {"label": "User", "detail": "One role, one person. \"Small businesses\" is not a user."},
     {"label": "Evidence", "detail": "What they did about it, not what they said they would do."},
     {"label": "Solution", "detail": "Only now. And only the smallest version that tests the belief."},
     {"label": "Product", "detail": "The solution plus everything that makes it usable by somebody who is not you."}
   ],
   "example": "Problem: agency owners lose two hours a week reconciling invoices across three tools. User: the owner of a 5–15 person agency who does the books themselves. Evidence: four of six built their own spreadsheet to cope, and two pay a bookkeeper for it. Solution: import from those three tools and show the mismatches.",
   "whenToUse": "The first time you have an idea, and every time you feel like skipping ahead.",
   "commonMistake": "Treating enthusiasm as evidence. Somebody being interested in your idea costs them nothing."
 }$json$::jsonb),

('framework', 'explore-plan-build-verify', 'Explore → Plan → Build → Verify',
 'The loop for directing an AI execution layer without losing control of the codebase.',
 'build', '{claude-code,workflow,method}', 2, true,
 $json${
   "purpose": "Keeps you the founder rather than the person pasting whatever came back.",
   "explanation": "The failure mode when building with AI is not bad code, it is code you did not read shipped into a system you no longer understand. Each step exists to keep a human decision between the model and the repository. Verify is not optional and it is not the model's job.",
   "flow": ["Explore", "Plan", "Build", "Verify", "Review"],
   "steps": [
     {"label": "Explore", "detail": "Have it read the existing code and tell you what is there. Correct it before going further."},
     {"label": "Plan", "detail": "A written plan you approve. What it will not do matters as much as what it will."},
     {"label": "Build", "detail": "Small changes. A change too large to review is a change you did not make."},
     {"label": "Verify", "detail": "Typecheck, lint, tests, build, then open the thing and use it. Green checks are not verification."},
     {"label": "Review", "detail": "Read the diff as though a stranger wrote it. Because one did."}
   ],
   "example": "Explore: \"read src/lib/auth and describe how sessions are refreshed\". Plan: \"add Google sign-in — list the files and what breaks\". Build: one action, one component. Verify: npm run check, then click the button. Review: read the diff, ask why the callback changed.",
   "whenToUse": "Every change beyond a typo.",
   "commonMistake": "Skipping Verify because the model said it was done. It does not know; it has not run it."
 }$json$::jsonb),

('framework', 'evidence-quality-ladder', 'The evidence ladder',
 'Ranks the things founders call validation, from worthless to conclusive.',
 'validate', '{validation,evidence,research}', 3, true,
 $json${
   "purpose": "Gives you a straight answer to \"is this validated?\" instead of a feeling.",
   "explanation": "Every rung costs more to obtain and is worth more than the one below. Most ideas that die had evidence from the bottom two rungs and were treated as though they had evidence from the top. You do not need the top rung to start — you need to know which rung you are actually on.",
   "flow": ["Opinion", "Stated intent", "Past behaviour", "Effort", "Money"],
   "steps": [
     {"label": "Opinion", "detail": "\"That sounds useful.\" Worth nothing. People are kind."},
     {"label": "Stated intent", "detail": "\"I would definitely use that.\" Worth almost nothing."},
     {"label": "Past behaviour", "detail": "They built a workaround, or pay for a worse tool. Now you have something."},
     {"label": "Effort", "detail": "They gave you an hour, an introduction, or their real data."},
     {"label": "Money", "detail": "They paid, or pre-paid. Conclusive, and the only rung that is."}
   ],
   "example": "Six people said the problem was real (Opinion). Four had built spreadsheets for it (Past behaviour). Two agreed to pay for a beta before it existed (Money). That is a validated problem.",
   "whenToUse": "Whenever you catch yourself saying an idea is validated.",
   "commonMistake": "Counting the same person twice on two rungs and calling it two data points."
 }$json$::jsonb);

-- ── TEMPLATES ───────────────────────────────────────────────────────────────

insert into public.toolbox_items (kind, slug, title, summary, phase_key, tags, position, published, is_demo, body) values
('template', 'idea-brief', 'Idea Brief',
 'One page that turns an idea into something specific enough to be wrong.',
 'think', '{template,idea,brief}', 1, true, false,
 $json${
   "instructions": "Fill each section in your own words. Write the assumptions section last and be honest in it — that section is the reason the document exists.",
   "sections": [
     {"id": "problem", "title": "The problem", "guidance": "One sentence, in the words somebody with it would use."},
     {"id": "who", "title": "Who has it", "guidance": "A role and, ideally, a name. Not a segment."},
     {"id": "today", "title": "What they do today", "guidance": "The spreadsheet, the agency, the nothing."},
     {"id": "why-now", "title": "Why now", "guidance": "What changed that makes this worth building this year."},
     {"id": "assumptions", "title": "What I am assuming", "guidance": "Mark which you have checked and which you have not."},
     {"id": "riskiest", "title": "The riskiest assumption", "guidance": "The one that, if false, makes the rest pointless."}
   ],
   "example": "The problem: agency owners lose two hours a week reconciling invoices across three tools. Riskiest assumption: that they would change tools to fix it, rather than living with two hours."
 }$json$::jsonb),

('template', 'validation-report', 'Validation Report',
 'What you learned, what rung of evidence it sits on, and what you now believe.',
 'validate', '{template,validation,evidence}', 2, true, false,
 $json${
   "instructions": "Write it after the conversations, not during. Quote people rather than summarising them — your summary is already contaminated by what you hoped to hear.",
   "sections": [
     {"id": "assumption", "title": "What I set out to test", "guidance": "The assumption in one sentence."},
     {"id": "who", "title": "Who I spoke to", "guidance": "How many, what roles, how you reached them."},
     {"id": "quotes", "title": "What they actually said", "guidance": "Direct quotes. Include the ones that contradict you."},
     {"id": "behaviour", "title": "What they have already done", "guidance": "Workarounds, spending, time. The evidence ladder."},
     {"id": "rung", "title": "Where this sits on the ladder", "guidance": "Opinion, stated intent, past behaviour, effort or money."},
     {"id": "verdict", "title": "What I now believe", "guidance": "And what would change your mind."}
   ],
   "example": "Rung: past behaviour, four of six. Verdict: the problem is real and the pain is real, but nobody has switched tools over it — so the risk moved from demand to adoption."
 }$json$::jsonb),

('template', 'technical-blueprint', 'Technical Blueprint',
 'The plan you approve before an execution layer writes anything.',
 'build', '{template,architecture,claude-code}', 3, true, false,
 $json${
   "instructions": "Produced with the Plan before you build prompt, then edited by you. The editing is the point — a plan you did not change is a plan you did not read.",
   "sections": [
     {"id": "goal", "title": "What this change achieves", "guidance": "The outcome, in the user's terms."},
     {"id": "approach", "title": "Approach", "guidance": "Five sentences, plus one alternative rejected and why."},
     {"id": "surface", "title": "Files and data touched", "guidance": "Everything created or changed, and the migrations."},
     {"id": "risks", "title": "What could break quietly", "guidance": "The failures that would not show up immediately."},
     {"id": "out-of-scope", "title": "Deliberately not doing", "guidance": "Say it here so it is a decision rather than an omission."},
     {"id": "verification", "title": "How I will verify it", "guidance": "Exact commands, and what passing looks like."}
   ],
   "example": "Out of scope: file uploads. The deliverable model covers text and URLs, and Storage can be added behind one column without touching a policy."
 }$json$::jsonb);

-- ── CHECKLISTS ──────────────────────────────────────────────────────────────

insert into public.toolbox_items (kind, slug, title, summary, phase_key, tags, position, published, body) values
('checklist', 'before-you-write-code', 'Before you write any code',
 'The five things that must be true before a codebase is the right next step.',
 'validate', '{checklist,validation}', 1, true,
 $json${
   "intro": "A checklist is a safety tool, not proof. Ticking every box does not mean the idea is good — it means you have stopped guessing about the things that are cheap to check.",
   "groups": [
     {"title": "The problem", "items": [
       {"id": "p1", "label": "I can state the problem in one sentence somebody could disagree with"},
       {"id": "p2", "label": "I can name a person who has it, not a market that contains them"}
     ]},
     {"title": "The evidence", "items": [
       {"id": "e1", "label": "I have spoken to at least five of them"},
       {"id": "e2", "label": "I know what they use today and what it costs them"},
       {"id": "e3", "label": "At least some of them have already built a workaround", "detail": "Past behaviour, not stated intent. See the evidence ladder."}
     ]},
     {"title": "The scope", "items": [
       {"id": "s1", "label": "I know the smallest version that would test the riskiest assumption"},
       {"id": "s2", "label": "I have written down what I am not building"}
     ]}
   ]
 }$json$::jsonb),

('checklist', 'ship-checklist', 'Before you ship',
 'What to verify before a product is in front of somebody who is not you.',
 'ship', '{checklist,ship,production}', 2, true,
 $json${
   "intro": "Run this against production, not against your laptop. Half of these only fail in the environment you are not looking at.",
   "groups": [
     {"title": "It runs", "items": [
       {"id": "r1", "label": "Production build succeeds and the deployed URL opens"},
       {"id": "r2", "label": "Environment variables are set in the deployment, not only locally"},
       {"id": "r3", "label": "Sign-in works end to end on the deployed origin"}
     ]},
     {"title": "It survives", "items": [
       {"id": "s1", "label": "Every error state renders something a person can act on"},
       {"id": "s2", "label": "The empty state of every screen has been seen with a real new account"},
       {"id": "s3", "label": "It works on a phone, at 375px, on the real device"}
     ]},
     {"title": "It is not open", "items": [
       {"id": "x1", "label": "Row Level Security is on for every table holding user data"},
       {"id": "x2", "label": "No secret is readable from the browser bundle"},
       {"id": "x3", "label": "A second account cannot see the first account's data", "detail": "Test it. Do not reason about it."}
     ]}
   ]
 }$json$::jsonb);

-- ── RESOURCES ───────────────────────────────────────────────────────────────

insert into public.toolbox_items (kind, slug, title, summary, phase_key, tags, position, published, is_demo, body) values
('resource', 'supabase-rls-docs', 'Supabase — Row Level Security',
 'The reference for the mechanism every LOCK table depends on.',
 'build', '{supabase,security,docs}', 1, true, false,
 $json${
   "resourceKind": "doc",
   "url": "https://supabase.com/docs/guides/database/postgres/row-level-security",
   "source": "Supabase",
   "why": "Read it before writing your first policy, not after your first leak. LOCK's own schema is built on the patterns in here, and the section on performance explains why every policy in this codebase wraps auth.uid() in a select."
 }$json$::jsonb),

('resource', 'nextjs-data-security', 'Next.js — Data security and Server Actions',
 'How a Server Action is a public endpoint, and what that means for your checks.',
 'build', '{nextjs,security,docs}', 2, true, false,
 $json${
   "resourceKind": "doc",
   "url": "https://nextjs.org/docs/app/guides/authentication",
   "source": "Next.js",
   "why": "The single most expensive misunderstanding in this stack is thinking a Server Action is protected because the page that calls it is. It is a URL. Read this before you rely on a layout for authorisation."
 }$json$::jsonb),

('resource', 'mom-test', 'The Mom Test',
 'How to ask about a problem without inviting a polite lie.',
 'research', '{research,interviews,book}', 3, true, false,
 $json${
   "resourceKind": "book",
   "url": "https://www.momtestbook.com/",
   "source": "Rob Fitzpatrick",
   "why": "Short, and it will change how you run every conversation in the RESEARCH and VALIDATE phases. The central idea — ask about their life, never about your idea — is what the Interview without leading prompt encodes."
 }$json$::jsonb),

('resource', 'demo-video-placeholder', 'User interviews in practice',
 'Placeholder video resource, present so the engine can render one with a timestamp.',
 'research', '{demo,video}', 4, true, true,
 $json${
   "resourceKind": "video",
   "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
   "source": "Demo resource",
   "durationSeconds": 720,
   "startSeconds": 260,
   "endSeconds": 670,
   "why": "Demo row. Replaced with real material when the curriculum is written — it exists so a timestamped external resource can be seen rendering with its reason attached."
 }$json$::jsonb);

-- ── STACK ───────────────────────────────────────────────────────────────────

insert into public.toolbox_items (kind, slug, title, summary, tags, position, published, body) values
('stack_tool', 'claude-code', 'Claude Code',
 'The execution layer LOCK teaches you to direct.',
 '{ai,execution,build}', 1, true,
 $json${
   "what": "An AI coding agent that reads your codebase, plans changes, writes them and runs your checks.",
   "why": "It removes the part of building that used to require a team, and leaves the part that requires a founder — deciding what to build and verifying it was built.",
   "whenToUse": "Every change to a codebase. Its value scales with how well you brief it, which is why LOCK spends as long on planning prompts as on code.",
   "alternatives": ["Other coding agents", "Writing it yourself, which is still the right answer for anything you do not understand yet"],
   "commonMistake": "Treating it as an oracle. It does not know whether your product should exist, and it will build the wrong thing beautifully.",
   "docsUrl": "https://code.claude.com/docs"
 }$json$::jsonb),

('stack_tool', 'supabase', 'Supabase',
 'Database, authentication and storage, without running a backend.',
 '{database,auth,backend}', 2, true,
 $json${
   "what": "A hosted PostgreSQL with authentication, an auto-generated API and row-level authorisation built in.",
   "why": "It gives a solo founder persistent data and real accounts in an afternoon, and its Row Level Security means authorisation lives in the database rather than in whichever code path you remembered to guard.",
   "whenToUse": "As soon as the product needs accounts or state that outlives a page load.",
   "alternatives": ["A hand-rolled backend, when you need control it will not give you", "Firebase, if you prefer documents to tables and can live without SQL"],
   "commonMistake": "Reaching for the service-role key to make something work. It bypasses every policy you wrote — if you need it in application code, the schema is usually wrong.",
   "docsUrl": "https://supabase.com/docs"
 }$json$::jsonb),

('stack_tool', 'nextjs', 'Next.js',
 'The framework LOCK itself is built in.',
 '{frontend,react,fullstack}', 3, true,
 $json${
   "what": "A React framework that renders on the server by default and lets a form post straight to a server function.",
   "why": "One codebase for the interface and the server logic, which for one person is the difference between shipping and integrating.",
   "whenToUse": "Any product with a web interface and a server. Less compelling for a pure API or a native app.",
   "alternatives": ["Vite plus a separate API, when you want the two decoupled", "Astro, when the product is mostly content"],
   "commonMistake": "Assuming a Server Action is private because the page calling it is protected. It is a public endpoint and needs its own check.",
   "docsUrl": "https://nextjs.org/docs"
 }$json$::jsonb),

('stack_tool', 'github', 'GitHub',
 'Where the code lives, and the record of how it got there.',
 '{git,version-control,evidence}', 4, true,
 $json${
   "what": "Hosted Git, with pull requests, review and history.",
   "why": "It is the source of truth for a codebase and the reason you can undo a bad afternoon. In LOCK it is also evidence — a repository URL and a commit are things somebody can open.",
   "whenToUse": "From the first file. A project that is not in version control is a project you are one mistake away from losing.",
   "alternatives": ["GitLab or a self-hosted remote, if you need it somewhere specific"],
   "commonMistake": "Committing a .env file. Check what an ignore rule actually matches — an unanchored pattern catches directories you did not mean.",
   "docsUrl": "https://docs.github.com"
 }$json$::jsonb);

-- ── Contextual links ────────────────────────────────────────────────────────
--
-- The reason the join tables exist: a learner should never have to work out
-- which item from a growing library applies to the thing in front of them.

insert into public.lesson_toolbox_items (lesson_id, item_id, position)
select '00000000-0000-4000-8000-000000000010', id, position
from public.toolbox_items
where slug in ('pressure-test-an-idea', 'problem-user-evidence', 'evidence-quality-ladder')
on conflict do nothing;

insert into public.mission_toolbox_items (mission_id, item_id, position)
select '00000000-0000-4000-8000-000000000100', id, position
from public.toolbox_items
where slug in ('pressure-test-an-idea', 'idea-brief', 'problem-user-evidence', 'before-you-write-code')
on conflict do nothing;

insert into public.toolbox_item_links (item_id, related_item_id)
select a.id, b.id from public.toolbox_items a, public.toolbox_items b
where (a.slug, b.slug) in (
  ('pressure-test-an-idea', 'problem-user-evidence'),
  ('problem-user-evidence', 'evidence-quality-ladder'),
  ('idea-brief', 'pressure-test-an-idea'),
  ('plan-before-you-build', 'technical-blueprint'),
  ('plan-before-you-build', 'explore-plan-build-verify'),
  ('technical-blueprint', 'explore-plan-build-verify'),
  ('validation-report', 'evidence-quality-ladder'),
  ('interview-without-leading', 'mom-test')
)
on conflict do nothing;
