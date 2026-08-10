# Safe handling of a plan after its planned day

Research completed: 2026-08-10

## Question

When an unfinished planned item passes its planned day, should Leslie move it to `Someday` automatically?

This is a targeted evidence review, not a registered systematic review. It uses original peer-reviewed studies, meta-analyses, and official journal, DOI, or PubMed pages. No study in this review directly tested an automatic `Someday` transfer in a task application.

## Recommendation

Keep `Someday`, but make entry explicit. Do not move an expired plan there automatically.

At the first relevant app opening after the planned day, show a quiet, non-blocking `Outside plan` card. Preserve the original plan until the user selects an action. Offer these actions:

1. `Plan today…`
2. `Choose date…`
3. `Move to Someday`
4. `Stop planning`
5. `Not now`

If the user did the work, offer `Log as done…` through Leslie's factual work-log flow. Do not infer completion.

This recommendation has medium-high confidence. The evidence strongly rejects the assumption that every unfulfilled intention has one cause. The exact card, copy, and review timing remain product inferences that need Leslie-specific testing.

## Why automatic `Someday` is not safe

### A passed plan is an ambiguous event

A 2026 diary study collected 1,823 non-routine next-day intentions from 102 distance-learning students over two five-day periods. Forgetting accounted for only about 10%–14% of reported non-completions. Situational and motivational reasons were more common. Cross-validation with a second dataset of 409 intentions mostly reproduced the result. The study used self-report and a specific student sample, so it cannot estimate all Leslie users. It does show that one automatic response cannot represent the reason for every missed plan ([Haas et al., 2026, PubMed](https://pubmed.ncbi.nlm.nih.gov/42249168/)).

**Product inference:** Leslie cannot know whether the user still intends the task, faced an external block, chose another priority, forgot, or abandoned the goal. An automatic transfer records a decision that the user did not make.

### `Someday` is not a specific plan

A series of laboratory studies found that unfinished goals produced intrusive thoughts, greater goal-word accessibility, and worse performance on an unrelated task. Letting participants make a specific plan removed these cognitive interference effects. The effect depended on earnest plans and did not require goal completion. These studies mostly used controlled tasks and student samples. They did not test automatic filing or long task backlogs ([Masicampo & Baumeister, 2011, PubMed](https://pubmed.ncbi.nlm.nih.gov/21688924/)).

One correlational study and two experiments found that implementation intentions improved difficult-goal completion and action initiation. An implementation intention links an intended action to a specific situation, such as when and where it will happen. These older studies did not test task applications or expired plans ([Gollwitzer & Brandstatter, 1997, DOI](https://doi.org/10.1037/0022-3514.73.1.186)).

**Product inference:** `Someday` can store an intention, but it does not supply the specific cue that made planning useful in these studies. If the goal remains active, `Plan today…` or `Choose date…` is better aligned with the evidence.

### Goal adjustment can help, but the user must determine the goal's status

Three questionnaire studies covered 115 undergraduates, 120 younger and older adults, and 45 parents of children with or without cancer. The capacity to disengage from unattainable goals and reengage with alternatives was associated with higher subjective well-being. These were associations between individual capacities and well-being, not tests of forced goal changes ([Wrosch et al., 2003, PubMed](https://pubmed.ncbi.nlm.nih.gov/15018681/)).

A meta-analysis of 421 effect sizes from 31 samples found small positive associations between goal disengagement and quality of life (`r = 0.08`) and larger associations for goal reengagement (`r = 0.19`). Effects varied by outcome and population. The association between disengagement and depressive symptoms reversed in samples at risk for depression. Most included evidence was observational, so it does not prove that a product-induced disengagement improves well-being ([Barlow et al., 2020, PubMed](https://pubmed.ncbi.nlm.nih.gov/31131441/)).

Two daily diary studies followed 61 couples pursuing physical activity and 83 couples pursuing smoking cessation. On days with more goal disengagement, participants reported lower well-being and had lower goal achievement. The health-goal and couple context limits transfer to ordinary tasks, but the result shows that disengagement is not uniformly helpful ([Luscher et al., 2017, PubMed](https://pubmed.ncbi.nlm.nih.gov/28332338/)).

**Product inference:** `Stop planning` and `Move to Someday` are useful choices. Leslie should not treat one missed day as proof that a goal is unattainable or no longer active.

### Automatic transfer is a consequential default

Four experiments in organ-donation and retirement-saving contexts found that people treated a default as an implicit recommendation from the person who set it. These domains differ greatly from task management, so the finding does not measure `Someday` behavior. It does show that an automatic state is not neutral merely because the user can reverse it later ([McKenzie, Liersch, & Finkelstein, 2006, DOI](https://doi.org/10.1111/j.1467-9280.2006.01721.x)).

**Product inference:** Automatic transfer tells users that Leslie recommends `Someday` for unfinished work. It also makes passive acceptance easier than choosing a new date, keeping the old plan, or stopping the goal.

### Moving work away can provide immediate relief while preserving later cost

A meta-analysis based on 691 correlations identified task aversiveness, longer delay, lower self-efficacy, and impulsiveness as strong and consistent procrastination predictors. The included evidence was heterogeneous and often correlational. It does not show that `Someday` causes procrastination ([Steel, 2007, PubMed](https://pubmed.ncbi.nlm.nih.gov/17201571/)).

Two longitudinal student studies found that procrastinators reported less stress and illness early in a term, but more later. They also received lower grades. The student context and observational design limit causal product conclusions ([Tice & Baumeister, 1997, journal page](https://journals.sagepub.com/doi/10.1111/j.1467-9280.1997.tb00460.x)).

**Product inference:** Automatic transfer can reduce today's visible burden. If it also adds indefinite delay, the relief can hide a still-active task rather than resolve it. This risk makes an unbounded automatic backlog a poor default.

### External storage helps, but more storage is not always better

In three laboratory experiments, participants could use unaided memory for a larger reward or external reminders for a smaller reward. Participants used reminders more than their measured performance justified. Metacognitive advice removed the average bias. These artificial reward tasks did not test task lists, but they show that cognitive offloading has costs and benefits that users do not always balance well ([Gilbert et al., 2020, PubMed](https://pubmed.ncbi.nlm.nih.gov/31448938/)).

**Product inference:** Leslie should support offloading, but it should not externalize every expired intention into one permanent list. A visible decision surface preserves the benefit of capture without assuming the correct destination.

## Evidence summary

| Topic | Direct evidence | Design and main limit | Leslie inference |
| --- | --- | --- | --- |
| Unfinished-goal rumination | Specific plans reduced intrusive thoughts and cognitive interference from unfinished goals ([Masicampo & Baumeister, 2011](https://pubmed.ncbi.nlm.nih.gov/21688924/)). | Controlled laboratory studies; mostly students; no backlog or auto-transfer test. | Ask for a concrete next plan when intent remains active. |
| Implementation intentions | When-and-where plans improved completion and action initiation ([Gollwitzer & Brandstatter, 1997](https://doi.org/10.1037/0022-3514.73.1.186)). | One correlational and two experimental studies; older and task-specific evidence. | A date or cue is more useful than an undated destination for active goals. |
| Weekly planning | A field experiment with 208 flexible workers and 947 weekly entries found fewer unfinished tasks and less weekly rumination, plus more cognitive flexibility ([Uhlig et al., 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10952538/)). | All participants had two baseline weeks followed by five intervention weeks; combined several planning methods; outcomes were mainly self-reported. | Offer a weekly review, but do not claim an ideal review cadence. |
| Reasons for non-completion | Forgetting was a minority reason in a naturalistic intention diary ([Haas et al., 2026](https://pubmed.ncbi.nlm.nih.gov/42249168/)). | Self-report; 102 distance-learning students; two short observation periods. | Ask what happens next. Do not apply one meaning automatically. |
| Goal adjustment | Disengagement and reengagement capacities had small positive quality-of-life associations across 31 samples ([Barlow et al., 2020](https://pubmed.ncbi.nlm.nih.gov/31131441/)). | Meta-analysis of mainly observational evidence; effects varied by group and outcome. | Keep explicit `Someday` and `Stop planning` actions. |
| Context risk | Daily disengagement related to lower well-being and achievement in two health-goal diary studies ([Luscher et al., 2017](https://pubmed.ncbi.nlm.nih.gov/28332338/)). | Couples pursuing physical activity or smoking cessation; not ordinary work tasks. | Do not interpret every missed day as a reason to disengage. |
| Procrastination | Delay and task aversiveness were strong correlates in a 691-correlation meta-analysis ([Steel, 2007](https://pubmed.ncbi.nlm.nih.gov/17201571/)). | Heterogeneous evidence; many correlational studies; no task-app intervention. | Monitor whether `Someday` becomes indefinite avoidance. |
| Defaults | Defaults can act as implicit recommendations ([McKenzie et al., 2006](https://doi.org/10.1111/j.1467-9280.2006.01721.x)). | Four experiments in policy and finance contexts. | Treat automatic transfer as a product decision, not neutral housekeeping. |
| Neutral tone | In 119 first-year students, self-forgiveness after procrastination was associated with less procrastination before the next exam, mediated by lower negative affect ([Wohl, Pychyl, & Bennett, 2010](https://doi.org/10.1016/j.paid.2010.01.029)). | Observational longitudinal study in one course; no interface-copy manipulation. | Prefer factual copy. This is weak support, not proof of a copy effect. |

## Recommended interaction

### State transition

At the local day boundary, derive an `outside plan` state. Do not move or rewrite the item. This preserves the user's original plan and makes the transition reversible.

Do not send a midnight notification. Show the card when the user first opens today's work surface after the transition. This timing is a product inference. The reviewed studies do not compare midnight, morning, or first-open prompts.

If the user takes no action, leave the item in `outside plan`. Close the card for the current day after `Not now`, and retain a quiet count in the interface. Do not repeat the same prompt during that day.

### Card copy

Recommended copy:

> **Outside plan**
>
> **1 plan needs a decision**
>
> Planned for Sunday, 9 August at 14:00 · 30 min
>
> `Plan today…` `Choose date…` `Move to Someday` `More…`

The `More…` menu can contain `Log as done…`, `Stop planning`, and `Not now`.

Use factual terms:

- `Planned for yesterday`
- `Choose what happens next`
- `Plan today…`
- `Choose date…`
- `Move to Someday`
- `Keep without a date` as the description for `Someday`
- `Stop planning`
- `Not now`

Avoid judgment or false deadline semantics:

- `Failed`
- `You missed this`
- `Still not done?`
- `Clear your backlog`
- `Overdue`, unless the user explicitly set a due date

Leslie records a planned time, not a due-date contract. `Overdue` would add meaning that the user did not supply. The neutral-copy recommendation has only indirect support from the self-forgiveness study above.

### Action behavior

- `Plan today…` must ask for, or make explicit, a usable time cue. It must not keep a time that already passed.
- `Choose date…` opens the normal date-and-time control.
- `Move to Someday` removes the active date and records an explicit user action.
- `Stop planning` removes the active intention but preserves its history. It must not silently delete the record.
- `Log as done…` creates a factual work-log entry. It must not infer that the planned duration equals actual work.
- `Not now` makes no task-state change.

These behaviors are product inferences. They apply the direct evidence on specific plans, ambiguous non-completion, and intentional goal adjustment.

### Batch behavior

Show one grouped card when several plans pass together. Keep item-level actions available. Do not make `Move all to Someday` the primary action.

If Leslie later adds a bulk transfer, require an explicit selection and provide immediate undo. A bulk action magnifies an incorrect inference across several independent goals.

## `Someday` review behavior

`Someday` should mean an accepted intention with no active date. It should not mean failed, deleted, or hidden work.

Offer one optional weekly review surface. Weekly planning reduced unfinished tasks and rumination in the field experiment, but that study combined prioritization, work-step planning, obstacle planning, deadlines, locations, and visualization. It does not prove that weekly is the optimal `Someday` cadence ([Uhlig et al., 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10952538/)).

During review, offer:

1. `Plan…`
2. `Keep in Someday`
3. `Stop planning`

Record when an item was last reviewed so the same item does not reappear on every app opening. Do not move a `Someday` item back into the plan automatically. Do not delete old items automatically.

Use a quiet review invitation, such as `Review Someday`, with the item count. Avoid streaks, warnings, or repeated daily reminders. No reviewed study establishes that repeated prompts improve this decision.

## Leslie-specific model constraint

Leslie already defines a `Someday` list, but every `PlannedItem` currently requires `scheduledAt`. The range query also filters every list by `scheduledAt` ([`src/model.ts`](../../src/model.ts)).

Changing only `listId` to `someday` would therefore preserve the expired date. It would not create a true undated intention. Depending on the selected range, it could also make the item disappear from the current view while retaining stale schedule data.

Before implementation, define separate valid states for:

- planned with a date and time;
- outside plan with its original planned time;
- someday with no active date;
- stopped, with retained history;
- completed work in the factual log.

This data distinction is necessary for the recommended interaction. It also prevents `Someday` from becoming a renamed historical-date bucket.

## Product test before wider use

Start with the explicit card. Do not start with automatic transfer.

Measure these outcomes locally:

- share of outside-plan items that receive each explicit action;
- time from card display to a decision;
- `Someday` inflow, outflow, count, and item age;
- repeated rescheduling of the same item;
- immediate undo or correction after a move;
- whether still-intended items become hard to find;
- user-reported burden and judgment after the review.

Use short interviews or prototype tests to learn why plans passed. The journal evidence identifies several possible causes, but it does not give Leslie their distribution.

Only test automatic transfer later as an informed, reversible user preference. Do not make it the default. Compare it with the explicit card using hidden-item recovery, backlog growth, corrections, and perceived control as safety outcomes.

## Evidence gaps

- No located peer-reviewed study tested automatic rollover to a `Someday` list.
- No located study compared an `Outside plan` card with silent rollover.
- No direct evidence establishes the best prompt time, repetition limit, action order, or exact copy.
- Most unfinished-goal and implementation-intention experiments used controlled tasks or student samples.
- Goal-adjustment findings are mainly observational and vary by context and population.
- Procrastination findings do not establish that an undated list causes avoidance.
- The evidence does not identify effects for Leslie's likely user mix, including people with attention or executive-function differences.

The safe product decision is therefore conservative: preserve truth, ask once, keep every action reversible, and let the user decide whether the goal remains scheduled, becomes undated, or stops.
