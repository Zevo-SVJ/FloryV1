-- Skill and milestone definitions
--
-- Definitions, not content. Twenty-one skills and fifteen awards, each of them
-- a name for something a founder either can or cannot do — none of them a
-- lesson, a module or a mission. The curriculum that teaches them is authored
-- later; what this file guarantees is that when a lesson arrives, the skill it
-- introduces already exists to be linked to.
--
-- Nothing here is demo scaffolding. These rows are the real vocabulary of the
-- program and are expected to survive into production; the seeded *links*
-- between demo lessons and skills, at the bottom, are the disposable part and
-- are marked as such.

-- ────────────────────────────────────────────────────────────────────────────
-- Skills
-- ────────────────────────────────────────────────────────────────────────────

-- `demonstrates` is written in the second person because the skills page shows
-- it back to the learner as the claim they are making. It is the sentence they
-- should be able to defend when the state reaches `demonstrated`.
insert into public.skills (key, area, label, summary, demonstrates, position) values
  ('problem-discovery', 'thinking', 'Problem Discovery',
   'Finding a problem that is real, specific and somebody else''s.',
   'You can find a problem worth solving without starting from a solution.', 1),
  ('market-research', 'thinking', 'Market Research',
   'Learning a market before betting on it.',
   'You can map a market, its alternatives and its people from primary sources.', 2),
  ('validation', 'thinking', 'Validation',
   'Getting evidence before getting a codebase.',
   'You can design a test that could prove you wrong, and run it.', 3),
  ('critical-thinking', 'thinking', 'Critical Thinking',
   'Separating what you know from what you assume.',
   'You can name your assumptions and say which one would sink the idea.', 4),

  ('product-thinking', 'product', 'Product Thinking',
   'Turning a validated problem into a defined product.',
   'You can cut a product down to the version that solves the problem.', 1),
  ('scoping', 'product', 'Scoping',
   'Deciding what is not in version one.',
   'You can defend a scope, including the parts you left out.', 2),
  ('technical-planning', 'product', 'Technical Planning',
   'Turning a product decision into a build plan.',
   'You can plan a build somebody else could execute from.', 3),
  ('product-iteration', 'product', 'Product Iteration',
   'Changing the product because of what happened, not what you felt.',
   'You can take a result and turn it into the next decision.', 4),

  ('ux-thinking', 'design', 'UX Thinking',
   'Designing the path a person takes through the product.',
   'You can design a flow and say why each step exists.', 1),
  ('product-design', 'design', 'Product Design',
   'Deciding how it looks, reads and behaves.',
   'You can produce an interface that is consistent and defensible.', 2),
  ('writing', 'design', 'Product Writing',
   'The words in the interface, which are most of the interface.',
   'You can write copy that tells somebody what to do without a manual.', 3),

  ('claude-code', 'build', 'Claude Code',
   'Directing an execution layer rather than typing every line.',
   'You can take a feature from Explore to Plan to Build to Verify.', 1),
  ('ai-workflow', 'build', 'AI Workflow',
   'Building a repeatable process around an AI tool.',
   'You can turn a one-off prompt into a workflow you reuse.', 2),
  ('frontend', 'build', 'Frontend Development',
   'The part of the product people touch.',
   'You can build an interface that works on a phone and a screen reader.', 3),
  ('backend', 'build', 'Backend Development',
   'The part that has to be right when nobody is looking.',
   'You can build server logic that fails safely.', 4),
  ('database', 'build', 'Database Design',
   'Choosing the shape the data will keep.',
   'You can design a schema that does not need rewriting to add a feature.', 5),
  ('authentication', 'build', 'Authentication',
   'Knowing who somebody is, and what they may do.',
   'You can build auth where the boundary is enforced by the database.', 6),
  ('debugging', 'build', 'Debugging',
   'Finding out what is actually happening.',
   'You can reproduce a bug before you try to fix it.', 7),

  ('testing', 'ship', 'Testing',
   'Proving it works rather than assuming it.',
   'You can write a test that would have caught the bug you just fixed.', 1),
  ('deployment', 'ship', 'Deployment',
   'Getting it in front of real people, in production.',
   'You can deploy, and roll back.', 2),
  ('analytics', 'ship', 'Analytics',
   'Measuring the thing that would change your mind.',
   'You can pick the one number that tells you whether it worked.', 3),

  ('monetization', 'business', 'Monetization',
   'Charging for it, and understanding why somebody pays.',
   'You can price a product and explain the price.', 1),
  ('growth', 'business', 'Growth',
   'Finding a channel that works and running it.',
   'You can run a channel long enough to know whether it works.', 2)
on conflict (key) do nothing;

-- ────────────────────────────────────────────────────────────────────────────
-- Milestones and achievements
-- ────────────────────────────────────────────────────────────────────────────

/*
 * Milestones mark the journey; achievements recognise a first.
 *
 * The split is presentational — same table, same evaluator — and the test for
 * which one a row is: would a learner point at it to say where they are
 * (milestone), or to say what they have done (achievement)?
 *
 * Four of these are `manual`, and that is the honest answer rather than a gap.
 * LOCK has no analytics and no billing integration, so it cannot see a real
 * user or a real payment. A mentor confirms those and the row records who did.
 */
insert into public.milestones
  (key, kind, title, summary, description, icon, requirement, requirement_config, position) values

  ('first-idea', 'milestone', 'First Idea',
   'You named what you are building.',
   'A project exists. It is the first commitment the program asks for, and everything after it hangs off this row.',
   '◆', 'project_started', '{}'::jsonb, 1),

  ('first-mission', 'achievement', 'First Mission',
   'You finished a piece of founder work.',
   'Reading is input. This is the first time you produced something.',
   '▲', 'missions_completed', '{"count": 1}'::jsonb, 2),

  ('first-artifact', 'achievement', 'First Artifact',
   'You submitted work for judgement.',
   'Putting work in front of somebody who might say it is not good enough is a step most people skip.',
   '■', 'artifacts_submitted', '{"count": 1}'::jsonb, 3),

  ('first-approval', 'achievement', 'First Approval',
   'Somebody read your work and said it holds.',
   'The first time the platform has evidence of capability rather than of activity.',
   '✓', 'artifacts_approved', '{"count": 1}'::jsonb, 4),

  ('validated', 'milestone', 'Validated',
   'You have evidence, not a hunch.',
   'A problem carried through the LOCK validation process and out the other side.',
   '◈', 'phase_completed', '{"phase": "validate"}'::jsonb, 5),

  ('product-builder', 'milestone', 'Product Builder',
   'You turned a validated problem into a defined product.',
   'The blueprint exists: what it does, for whom, and what is not in version one.',
   '◉', 'phase_completed', '{"phase": "product"}'::jsonb, 6),

  ('claude-operator', 'milestone', 'Claude Operator',
   'You can direct the execution layer.',
   'Demonstrated through approved work, not through having read about it.',
   '◐', 'skill_demonstrated', '{"skill": "claude-code"}'::jsonb, 7),

  ('first-build', 'milestone', 'First Build',
   'Working software exists.',
   'A repository with something in it that runs.',
   '⬢', 'evidence_submitted', '{"evidence_kind": "repository"}'::jsonb, 8),

  ('debugger', 'achievement', 'Debugger',
   'You found out what was actually happening.',
   'A debugging mission completed. Reproducing a bug is most of fixing it.',
   '◍', 'missions_completed', '{"count": 1, "mission_type": "debug"}'::jsonb, 9),

  ('builder', 'achievement', 'Builder',
   'Five missions done.',
   'Not a single good day — a pattern of finishing things.',
   '⬣', 'missions_completed', '{"count": 5}'::jsonb, 10),

  ('first-deploy', 'milestone', 'First Deploy',
   'You shipped to production.',
   'A deployment URL somebody else can open. The gap between a project and a product.',
   '▶', 'evidence_submitted', '{"evidence_kind": "deployment"}'::jsonb, 11),

  ('first-user', 'milestone', 'First User',
   'Somebody who is not you used it.',
   'Confirmed by your mentor: LOCK has no analytics and will not pretend to see this on its own.',
   '☉', 'manual', '{}'::jsonb, 12),

  ('first-payment', 'milestone', 'First Payment',
   'Somebody paid.',
   'Confirmed by your mentor. The moment the product stops being a project.',
   '❖', 'manual', '{}'::jsonb, 13),

  ('shipper', 'achievement', 'Shipper',
   'Idea to production, start to finish.',
   'You took something from a blank page to a URL that works.',
   '★', 'phase_completed', '{"phase": "ship"}'::jsonb, 14),

  ('founder', 'milestone', 'Founder',
   'You can do this without LOCK.',
   'The whole journey, demonstrated. Confirmed by your mentor, because independence is the one thing a progress bar cannot measure.',
   '✦', 'manual', '{}'::jsonb, 15)

on conflict (key) do nothing;

-- ────────────────────────────────────────────────────────────────────────────
-- Links from the demo content
-- ────────────────────────────────────────────────────────────────────────────

/*
 * The disposable part of this file.
 *
 * The seeded lessons and missions from Prompts 3 and 4 exist to prove the
 * engines run; linking them to skills proves the skill engine runs too, and
 * makes a brand-new account show something other than twenty-one rows of
 * `not_started` for anybody testing it. `is_demo` marks the content, so both
 * these links and the content go in one statement when the real curriculum
 * lands.
 */
insert into public.lesson_skills (lesson_id, skill_key)
select l.id, v.skill_key
from public.lessons l
join (values
  ('how-lock-teaches', 'problem-discovery'),
  ('how-lock-teaches', 'critical-thinking'),
  ('reading-a-teardown', 'critical-thinking')
) as v(slug, skill_key) on v.slug = l.slug
where l.is_demo
on conflict do nothing;

insert into public.mission_skills (mission_id, skill_key, is_primary)
select m.id, v.skill_key, v.is_primary
from public.missions m
join (values
  ('find-the-problem-worth-solving', 'problem-discovery', true),
  ('find-the-problem-worth-solving', 'validation', false),
  ('find-the-problem-worth-solving', 'writing', false)
) as v(slug, skill_key, is_primary) on v.slug = m.slug
where m.is_demo
on conflict do nothing;
