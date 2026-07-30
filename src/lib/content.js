import dataframeDeck from '@/content/pandas/dataframe.json';
import datetimeDeck from '@/content/pandas/datetime.json';
import groupbyDeck from '@/content/pandas/groupby.json';
import indexingDeck from '@/content/pandas/indexing.json';
import introductionDeck from '@/content/pandas/introduction.json';
import mergingDeck from '@/content/pandas/merging.json';
import missingValuesDeck from '@/content/pandas/missing-values.json';
import performanceDeck from '@/content/pandas/performance.json';
import pivotDeck from '@/content/pandas/pivot.json';
import plottingDeck from '@/content/pandas/plotting.json';
import readCsvDeck from '@/content/pandas/read-csv.json';
import seriesDeck from '@/content/pandas/series.json';
import sortingDeck from '@/content/pandas/sorting.json';
import windowFunctionsDeck from '@/content/pandas/window-functions.json';
import numpyDeck from '@/content/numpy/numpy-basics.json';
import matplotlibDeck from '@/content/matplotlib/matplotlib-basics.json';
import seabornDeck from '@/content/seaborn/seaborn-basics.json';

import dataframeLesson from '@/content/lessons/dataframe.json';
import datetimeLesson from '@/content/lessons/datetime.json';
import groupbyLesson from '@/content/lessons/groupby.json';
import indexingLesson from '@/content/lessons/indexing.json';
import introductionLesson from '@/content/lessons/introduction.json';
import mergingLesson from '@/content/lessons/merging.json';
import missingValuesLesson from '@/content/lessons/missing-values.json';
import performanceLesson from '@/content/lessons/performance.json';
import pivotLesson from '@/content/lessons/pivot.json';
import plottingLesson from '@/content/lessons/plotting.json';
import readCsvLesson from '@/content/lessons/read-csv.json';
import seriesLesson from '@/content/lessons/series.json';
import sortingLesson from '@/content/lessons/sorting.json';
import windowFunctionsLesson from '@/content/lessons/window-functions.json';
import numpyLesson from '@/content/lessons/numpy-basics.json';
import matplotlibLesson from '@/content/lessons/matplotlib-basics.json';
import seabornLesson from '@/content/lessons/seaborn-basics.json';

// Metro can't dynamically scan /content, so this is the one place that lists
// every deck/lesson by name. Adding a new topic means one new import + one
// new TOPICS entry here. Order follows CLAUDE.md's suggested learning path
// (a suggestion only — prerequisites drive ordering, not gating).
// `hue` keys into TopicHues (constants/theme.js) and `icon` is a Feather name —
// visual identity only, so each topic is recognisable at a glance. Hues repeat
// across topics and never carry state meaning (that's the semantic Colors).
//
// `hidden: true` keeps a finished deck out of the shipped app without deleting
// anything. Everything user-facing — tiles, seeding, the review queue, search,
// reference, achievements — reads the exported TOPICS, so hiding here hides it
// everywhere. Progress already on a device is left alone: getDueCards() skips
// state rows whose content isn't loaded, so unhiding restores it untouched.
const ALL_TOPICS = [
  { id: 'introduction', label: 'Introduction', subject: 'pandas', hue: 'blue', icon: 'compass' },
  { id: 'dataframe', label: 'DataFrame', subject: 'pandas', hue: 'violet', icon: 'grid' },
  { id: 'series', label: 'Series', subject: 'pandas', hue: 'teal', icon: 'list' },
  { id: 'read-csv', label: 'Read CSV', subject: 'pandas', hue: 'amber', icon: 'file-text' },
  { id: 'indexing', label: 'Indexing', subject: 'pandas', hue: 'indigo', icon: 'crosshair' },
  { id: 'sorting', label: 'Sorting', subject: 'pandas', hue: 'pink', icon: 'trending-up' },
  { id: 'missing-values', label: 'Missing values', subject: 'pandas', hue: 'orange', icon: 'help-circle' },
  { id: 'groupby', label: 'GroupBy', subject: 'pandas', hue: 'green', icon: 'layers' },
  { id: 'merging', label: 'Merging', subject: 'pandas', hue: 'blue', icon: 'git-merge' },
  { id: 'pivot', label: 'Pivot', subject: 'pandas', hue: 'violet', icon: 'rotate-cw' },
  { id: 'plotting', label: 'Plotting', subject: 'pandas', hue: 'pink', icon: 'bar-chart-2' },
  { id: 'datetime', label: 'DateTime', subject: 'pandas', hue: 'teal', icon: 'clock' },
  { id: 'window-functions', label: 'Window functions', subject: 'pandas', hue: 'indigo', icon: 'activity' },
  { id: 'performance', label: 'Performance', subject: 'pandas', hue: 'amber', icon: 'zap' },
  { id: 'numpy-basics', label: 'NumPy', subject: 'numpy', hue: 'pink', icon: 'cpu', hidden: true },
  // Own subjects, so each is its own course with its own tile and its own
  // "Wizard" achievement (achievements.js generates one per distinct subject).
  { id: 'seaborn-basics', label: 'Seaborn', subject: 'seaborn', hue: 'teal', icon: 'grid' },
  {
    id: 'matplotlib-basics',
    label: 'Matplotlib',
    subject: 'matplotlib',
    hue: 'orange',
    icon: 'sliders',
  },
];

export const TOPICS = ALL_TOPICS.filter((topic) => !topic.hidden);

const DECKS = {
  dataframe: dataframeDeck,
  datetime: datetimeDeck,
  groupby: groupbyDeck,
  indexing: indexingDeck,
  introduction: introductionDeck,
  merging: mergingDeck,
  'missing-values': missingValuesDeck,
  performance: performanceDeck,
  pivot: pivotDeck,
  plotting: plottingDeck,
  'read-csv': readCsvDeck,
  series: seriesDeck,
  sorting: sortingDeck,
  'window-functions': windowFunctionsDeck,
  'numpy-basics': numpyDeck,
  'seaborn-basics': seabornDeck,
  'matplotlib-basics': matplotlibDeck,
};

const LESSONS = {
  dataframe: dataframeLesson,
  datetime: datetimeLesson,
  groupby: groupbyLesson,
  indexing: indexingLesson,
  introduction: introductionLesson,
  merging: mergingLesson,
  'missing-values': missingValuesLesson,
  performance: performanceLesson,
  pivot: pivotLesson,
  plotting: plottingLesson,
  'read-csv': readCsvLesson,
  series: seriesLesson,
  sorting: sortingLesson,
  'window-functions': windowFunctionsLesson,
  'numpy-basics': numpyLesson,
  'seaborn-basics': seabornLesson,
  'matplotlib-basics': matplotlibLesson,
};

export function getDeck(topicId) {
  return DECKS[topicId];
}

export function getLesson(topicId) {
  return LESSONS[topicId];
}

export function getAllCards() {
  return TOPICS.flatMap((topic) => getDeck(topic.id).cards);
}
