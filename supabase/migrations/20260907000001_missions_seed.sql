-- One demo mission, to prove the work layer runs end to end.
--
-- Attached to the demo lesson from Prompt 3, which is the bridge this prompt
-- exists to build: learn it, then apply it to your own product. Flagged
-- `is_demo` and removed with `delete from public.missions where is_demo;`.
--
-- It requires no evidence, because THINK missions produce written thinking
-- rather than links. A BUILD or SHIP mission written later sets
-- `required_evidence` to '{repository,deployment}' and `submit_artifact()`
-- starts refusing submissions without them, with no code change.

insert into public.missions (
  id, phase_key, module_id, lesson_id, requires_lesson_id, slug, title, summary,
  type, difficulty, estimated_minutes, objective, why_it_matters, objectives,
  deliverable_title, deliverable_description, required_evidence,
  requires_reflection, position, published, is_demo, blocks
) values (
  '00000000-0000-4000-8000-000000000100',
  'think',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000000010',
  'find-the-problem-worth-solving',
  'Find the problem worth solving',
  'Turn a vague idea into a problem statement you could defend to somebody who has it.',
  'research',
  'foundational',
  60,
  'Leave with one problem, one person who has it, and one reason you believe it is real.',
  'A technically impressive SaaS with no validated demand is still a bad business. Everything after this depends on getting this right, and it is the cheapest thing in the program to get wrong.',
  array[
    'State a problem specifically enough that somebody could disagree with it',
    'Name the person who has it, not the market that contains them',
    'Separate what you know from what you are assuming'
  ],
  'Idea Brief',
  'One page: the problem, who has it, what they do about it today, and what you are assuming that you have not checked.',
  '{}',
  true,
  1,
  true,
  true,
  $json$[
    {"kind":"heading","id":"task","level":2,"text":"Your task"},
    {"kind":"text","id":"task-1",
     "text":"Write an Idea Brief for the SaaS you want to build. It is one page and it is not a pitch — nobody is being persuaded. It is the document you will argue with in six weeks when you are tempted to build something nobody asked for."},
    {"kind":"steps","id":"steps","title":"Work through it in this order",
     "items":[
       "Write the problem in one sentence, in the words somebody with the problem would use.",
       "Name one real person or one specific role that has it. Not \"small businesses\".",
       "Write what they do about it today — the spreadsheet, the agency, the nothing.",
       "List what you are assuming. Be honest about which of these you have actually checked.",
       "Write the one assumption that, if wrong, makes the whole idea worthless."
     ]},
    {"kind":"callout","id":"why-specific","tone":"tip","title":"Specific enough to be wrong",
     "text":"\"Businesses struggle with data\" cannot be disproved, which means it cannot be validated either. \"Agency owners lose two hours a week reconciling invoices across three tools\" can be checked by lunchtime."},
    {"kind":"heading","id":"context","level":2,"text":"Context"},
    {"kind":"text","id":"context-1",
     "text":"The lesson before this one argued that evidence beats conviction and that speed of evidence is the only advantage a solo founder reliably has. This mission is where that stops being a claim."},
    {"kind":"checklist","id":"done","title":"You are done when",
     "items":[
       "Somebody could read your problem statement and tell you it is wrong",
       "You have named a person, not a segment",
       "Your riskiest assumption is written down and you know it is the riskiest"
     ]},
    {"kind":"callout","id":"toolkit","tone":"note","title":"Toolkit",
     "text":"Frameworks, prompts and templates for this mission attach here once the Toolbox is built. Until then the steps above are the framework."}
  ]$json$::jsonb
) on conflict (slug) do nothing;
