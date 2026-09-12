// Single source of truth for the survey. The survey page renders from this and the
// results dashboard summarizes with it. Question ids become Sheet column names, so
// keep them stable; add new ids rather than renaming.

const SCALE5 = { min: 1, max: 5 };
const USEFUL = { ...SCALE5, minLabel: 'Not useful', maxLabel: 'Very useful' };
const AGREE = { ...SCALE5, minLabel: 'Strongly disagree', maxLabel: 'Strongly agree' };

const TAGS = [
  { value: 'helpful', label: 'Most helpful', hint: 'I would keep this exactly as is' },
  { value: 'redundant', label: 'Redundant / repetitive', hint: 'Covered elsewhere or too long' },
  { value: 'unclear', label: 'Confusing / too thin', hint: 'Needed more explanation or depth' },
];

const WEEK_LECTURES = {
  1: [
    ['1_1', 'Lecture 1.1 - Course Introduction'],
    ['1_2', 'Lecture 1.2 - History of AI in Medicine'],
    ['1_3', 'Lecture 1.3 - AI vs Machine Learning vs Deep Learning'],
    ['1_4', 'Lecture 1.4 - Discriminative AI vs Generative AI'],
    ['1_5', 'Lecture 1.5 - Supervised, Unsupervised, & Reinforcement Learning'],
    ['1_6', 'Lecture 1.6 - Introduction to Model Evaluation'],
    ['1_7', 'Lecture 1.7 - Sensitivity, Specificity, & the Confusion Matrix'],
    ['1_8', 'Lecture 1.8 - AUC, PPV, NPV'],
  ],
  2: [
    ['2_1', 'Lecture 2.1 - Neural Networks'],
    ['2_2', 'Lecture 2.2 - Deep Learning and Why Depth Matters'],
    ['2_3', 'Lecture 2.3 - CNNs in Medical Imaging'],
    ['2_4', 'Lecture 2.4 - AI in Radiology & Pathology'],
    ['2_5', 'Lecture 2.5 - Natural Language Processing'],
    ['2_6', 'Lecture 2.6 - The Transformer Revolution'],
    ['2_7', 'Lecture 2.7 - Large Language Models'],
    ['2_8', 'Lecture 2.8 - Understanding Hallucinations'],
  ],
  3: [
    ['3_1', 'Lecture 3.1 - Clinical Prompt Engineering'],
    ['3_2', 'Lecture 3.2 - Retrieval-Augmented Generation & Grounding'],
    ['3_3', 'Lecture 3.3 - Recognizing Bias in AI Systems'],
    ['3_4', 'Lecture 3.4 - The Optum Algorithm & Racial Bias'],
    ['3_5', 'Lecture 3.5 - Trust Calibration'],
    ['3_6', 'Lecture 3.6 - The Regulatory Landscape'],
    ['3_7', 'Lecture 3.7 - HIPAA, Privacy & "Shadow AI"'],
    ['3_8', 'Lecture 3.8 - Talking to Patients About AI in Their Care'],
  ],
  4: [
    ['4_1', 'Lecture 4.1 - Integrating AI into Clinical Workflows'],
    ['4_2', 'Lecture 4.2 - Evaluating AI Tools'],
    ['4_3', 'Lecture 4.3 - Specialty Spotlight'],
    ['4_4', 'Lecture 4.4 - AI Governance & Institutional Policy'],
    ['4_5', 'Lecture 4.5 - The Liability Question'],
    ['4_6', 'Lecture 4.6 - Building Your AI-Ready Career'],
  ],
};

const WEEK_TITLES = {
  1: 'Week 1: AI Foundations and Machine Learning Basics',
  2: 'Week 2: Deep Learning, NLP, and Large Language Models',
  3: 'Week 3: Applied Generative AI and Ethics',
  4: 'Week 4: Integration, Evaluation, and Future Directions',
};

function weekSection(n) {
  return {
    id: `week${n}`,
    title: WEEK_TITLES[n],
    questions: [
      {
        id: `w${n}_rating`, type: 'scale', label: `Overall, how helpful was Week ${n}?`,
        ...SCALE5, minLabel: 'Not helpful', maxLabel: 'Very helpful', allowNA: 'Did not do this week',
      },
      {
        id: `w${n}_lectures`, type: 'lecture_tags',
        label: `Tag any Week ${n} lectures that stood out. Leave a lecture untagged if it was fine.`,
        lectures: WEEK_LECTURES[n].map(([id, title]) => ({ id, title })),
        tags: TAGS,
      },
      {
        id: `w${n}_comment`, type: 'text', label: `Anything else about Week ${n}?`,
        placeholder: 'What worked, what dragged, what you would change', rows: 3,
      },
    ],
  };
}

export const SECTIONS = [
  {
    id: 'about',
    title: 'About you',
    intro: 'Two quick questions so I can read the rest in context. Skip anything you prefer not to answer.',
    questions: [
      {
        id: 'track', type: 'single', label: 'Which track were you on?',
        options: [
          { value: 'med', label: '4-week track (medical student elective)' },
          { value: 'grad', label: '6-week track (graduate student, for credit)' },
          { value: 'na', label: 'Prefer not to say' },
        ],
      },
      {
        id: 'prior_familiarity', type: 'scale', label: 'Before this course, how familiar were you with how AI and machine learning work?',
        ...SCALE5, minLabel: 'Not at all', maxLabel: 'Very familiar',
      },
      {
        id: 'prior_use', type: 'single', label: 'Before this course, how often did you use generative AI tools (ChatGPT, Claude, Gemini, Copilot, etc.)?',
        options: [
          { value: 'never', label: 'Never' },
          { value: 'rarely', label: 'A few times total' },
          { value: 'monthly', label: 'A few times a month' },
          { value: 'weekly', label: 'Weekly' },
          { value: 'daily', label: 'Most days' },
        ],
      },
    ],
  },
  {
    id: 'overall',
    title: 'The course overall',
    questions: [
      { id: 'overall_rating', type: 'scale', label: 'How would you rate the course overall?', ...SCALE5, minLabel: 'Poor', maxLabel: 'Excellent' },
      { id: 'expectations_met', type: 'scale', label: 'The course covered what I expected it to cover.', ...AGREE },
      { id: 'confidence_gain', type: 'scale', label: 'I feel more prepared to evaluate an AI tool I meet in training or practice than I did before the course.', ...AGREE },
      {
        id: 'workload', type: 'single', label: 'The syllabus estimated 8 to 10 hours a week. How did the actual workload compare?',
        options: [
          { value: 'much_less', label: 'Much less than that' },
          { value: 'less', label: 'Somewhat less' },
          { value: 'about', label: 'About right' },
          { value: 'more', label: 'Somewhat more' },
          { value: 'much_more', label: 'Much more than that' },
        ],
      },
      {
        id: 'pace', type: 'single', label: 'How was the pace?',
        options: [
          { value: 'too_slow', label: 'Too slow' },
          { value: 'bit_slow', label: 'A little slow' },
          { value: 'right', label: 'About right' },
          { value: 'bit_fast', label: 'A little fast' },
          { value: 'too_fast', label: 'Too fast' },
        ],
      },
      { id: 'recommend', type: 'scale', label: 'How likely are you to recommend this course to a classmate?', ...SCALE5, minLabel: 'Not likely', maxLabel: 'Very likely' },
    ],
  },
  weekSection(1),
  weekSection(2),
  weekSection(3),
  weekSection(4),
  {
    id: 'expectations',
    title: 'What you expected',
    intro: 'This is the part I most want to get right for the next group.',
    questions: [
      {
        id: 'expected_missing', type: 'multi', other: true,
        label: 'Did you expect the course to cover any of these, and it did not (or not enough)? Check all that apply.',
        options: [
          { value: 'coding', label: 'Hands-on coding or Python' },
          { value: 'build_model', label: 'Building or training a model yourself' },
          { value: 'ehr_tools', label: 'Specific clinical tools (Epic features, ambient scribes, decision support you will actually use)' },
          { value: 'specialty', label: 'A deeper dive into my own specialty or field' },
          { value: 'stats', label: 'More statistics and study design' },
          { value: 'regulation', label: 'More on regulation, policy, and law' },
          { value: 'prompt_practice', label: 'More hands-on prompt practice' },
          { value: 'research_writing', label: 'Using AI for research, literature review, or writing' },
          { value: 'patient_facing', label: 'Patient-facing AI (chatbots, symptom checkers, portals)' },
          { value: 'nothing', label: 'Nothing, it covered what I expected' },
        ],
      },
      { id: 'expect_missing_text', type: 'text', label: 'In your own words: what did you think we were going to cover that we did not?', rows: 4 },
      { id: 'unexpected_value_text', type: 'text', label: 'Was there anything you did not expect that turned out to be valuable?', rows: 3 },
      { id: 'repeated_text', type: 'text', label: 'Did anything feel repeated across weeks, or covered in both the lectures and the readings in a way that felt redundant?', rows: 4 },
    ],
  },
  {
    id: 'assessments',
    title: 'Quizzes and assignments',
    questions: [
      {
        id: 'assess_useful', type: 'matrix', label: 'How useful was each of these for your learning?',
        options: [
          { value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' },
          { value: '4', label: '4' }, { value: '5', label: '5' }, { value: 'na', label: 'Did not do' },
        ],
        scaleHint: '1 = not useful, 5 = very useful',
        rows: [
          { id: 'quiz1', label: 'Week 1 Quiz' },
          { id: 'quiz2', label: 'Week 2 Quiz' },
          { id: 'quiz3', label: 'Week 3 Quiz' },
          { id: 'muddiest', label: 'Week 2 Optional Muddiest Point Quiz' },
          { id: 'w2_prompt', label: 'Week 2 Assignment: Iterating Your Clinical Prompts' },
          { id: 'w3_reflection', label: 'Week 3 Reflection Essay: AI in Your Future Practice' },
          { id: 'w3_ethics', label: 'Week 3 Ethics Case Discussion (live or Canvas alternative)' },
          { id: 'w4_synthesis', label: 'Week 4 Assignment: Literature Synthesis' },
          { id: 'w4_final', label: 'Week 4 Final Project' },
          { id: 'mairs', label: 'MAIRS-MS pre and post surveys' },
        ],
      },
      {
        id: 'final_track', type: 'single', label: 'Which final project track did you choose?',
        options: [
          { value: 'a', label: 'Track A: Manuscript Analysis' },
          { value: 'b', label: 'Track B: Implementation Proposal' },
          { value: 'none', label: 'Did not complete the final project' },
        ],
      },
      { id: 'assess_clear_text', type: 'text', label: 'Which assignment had the clearest instructions, and which was hardest to figure out what was being asked?', rows: 3 },
      { id: 'assess_time_text', type: 'text', label: 'Did any assignment take much more or less time than its estimate said? Which one, and roughly how long did it take?', rows: 3 },
    ],
  },
  {
    id: 'readings',
    title: 'Readings and live sessions',
    questions: [
      {
        id: 'read_amount', type: 'matrix', label: 'How much of each did you read?',
        options: [
          { value: 'none', label: 'None' }, { value: 'some', label: 'Some' },
          { value: 'most', label: 'Most' }, { value: 'all', label: 'All' },
        ],
        rows: [
          { id: 'quinn', label: 'Quinn, Generative AI for the Medical Student' },
          { id: 'lee', label: 'Lee, Goldberg & Kohane, The AI Revolution in Medicine' },
          { id: 'papers', label: 'Assigned journal articles' },
        ],
      },
      {
        id: 'read_useful', type: 'matrix', label: 'For what you did read, how useful was it?',
        options: [
          { value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' },
          { value: '4', label: '4' }, { value: '5', label: '5' }, { value: 'na', label: 'Did not read' },
        ],
        scaleHint: '1 = not useful, 5 = very useful',
        rows: [
          { id: 'quinn', label: 'Quinn textbook' },
          { id: 'lee', label: 'Lee, Goldberg & Kohane textbook' },
          { id: 'papers', label: 'Assigned journal articles' },
        ],
      },
      {
        id: 'zoom_attended', type: 'multi', label: 'Which live Zoom sessions did you attend? Check all that apply.',
        options: [
          { value: 'w1', label: 'Week 1 orientation call' },
          { value: 'w2', label: 'Week 2 office hours' },
          { value: 'w3', label: 'Week 3 AI and Ethics case discussion' },
          { value: 'w4', label: 'Week 4 office hours' },
          { value: 'w5', label: 'Week 5 office hours' },
          { value: 'w6', label: 'Week 6 office hours' },
          { value: 'none', label: 'None of them' },
        ],
      },
      { id: 'zoom_value', type: 'scale', label: 'If you attended any live session, how valuable were they?', ...USEFUL, allowNA: 'Did not attend any' },
      { id: 'zoom_text', type: 'text', label: 'What would make the live sessions worth attending, or worth skipping?', rows: 3 },
      {
        id: 'did_weeks_5_6', type: 'single', label: 'Did you do any of Weeks 5 and 6?',
        options: [{ value: 'yes', label: 'Yes, some or all' }, { value: 'no', label: 'No' }],
        note: 'Answering yes opens a short section on those weeks below.',
      },
    ],
  },
  {
    id: 'weeks56',
    title: 'Weeks 5 and 6: Lab and Lightning Talks',
    showIf: { any: [{ questionId: 'track', values: ['grad'] }, { questionId: 'did_weeks_5_6', values: ['yes'] }] },
    questions: [
      { id: 'w5_lab_value', type: 'scale', label: 'How valuable was the Week 5 Lab Notebook (working directly with AI tools and trying to break them)?', ...USEFUL, allowNA: 'Did not do it' },
      { id: 'w6_talk_value', type: 'scale', label: 'How valuable was the Week 6 Lightning Talk and paper (completing the other final project track)?', ...USEFUL, allowNA: 'Did not do it' },
      {
        id: 'weeks56_core', type: 'single', label: 'Should Weeks 5 and 6 become part of the core course for everyone?',
        options: [
          { value: 'yes', label: 'Yes, both' },
          { value: 'lab_only', label: 'The lab week only' },
          { value: 'talk_only', label: 'The lightning talk only' },
          { value: 'no', label: 'No, keep them optional' },
        ],
      },
      { id: 'weeks56_text', type: 'text', label: 'Anything about Weeks 5 and 6?', rows: 3 },
    ],
  },
  {
    id: 'format',
    title: 'Format and delivery',
    questions: [
      {
        id: 'lecture_length', type: 'single', label: 'The video lectures ran about 10 to 20 minutes each. That was:',
        options: [
          { value: 'too_short', label: 'Too short' },
          { value: 'right', label: 'About right' },
          { value: 'too_long', label: 'Too long' },
          { value: 'mixed', label: 'Mixed, some too long and some too short' },
        ],
      },
      { id: 'av_quality', type: 'scale', label: 'Video and audio quality of the lectures', ...SCALE5, minLabel: 'Poor', maxLabel: 'Excellent' },
      { id: 'canvas_nav', type: 'scale', label: 'How easy was it to find what you needed in Canvas each week?', ...SCALE5, minLabel: 'Hard', maxLabel: 'Easy' },
      { id: 'broken_text', type: 'text', label: 'Was anything broken, missing, out of date, or confusing in Canvas? Broken links, mismatched instructions, duplicate pages, anything.', rows: 4 },
    ],
  },
  {
    id: 'closing',
    title: 'Last three',
    questions: [
      { id: 'one_change_text', type: 'text', label: 'If you could change one thing about the course, what would it be?', rows: 4 },
      { id: 'keep_text', type: 'text', label: 'What should absolutely stay the same?', rows: 3 },
      { id: 'anything_text', type: 'text', label: 'Anything else?', rows: 3 },
    ],
  },
];

// Ordered list of every (question, section) pair; handy for both pages.
export const QUESTIONS = SECTIONS.flatMap(s => s.questions.map(q => ({ ...q, sectionId: s.id })));
