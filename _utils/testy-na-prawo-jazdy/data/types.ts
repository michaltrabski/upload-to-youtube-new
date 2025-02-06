export interface NormalizedQuestion {
  id: string;
  text: string;
  textEn: string;
  textDe: string;
  a: string;
  aEn: string;
  aDe: string;
  b: string;
  bEn: string;
  bDe: string;
  c: string;
  cEn: string;
  cDe: string;
  r: string;
  media: string;
  categories: string[];
}

export interface NormalizedQuestionE4 extends NormalizedQuestion {
  score: number;
}

export interface NormalizedQuestionE5 extends NormalizedQuestion {
  score: number;
  whatWeWantToAskFor: string;
  relationToSafety: string;
  questionSource: string;
}

export interface NormalizedQuestionE6 extends NormalizedQuestion {
  questionSource: string;
  relationToSafety: string;
}

export interface QuestionBig {
  author?: string;
  hint?: string;
  slug: string;
  isActive: boolean;
  id: string;
  text: string;
  textEn: string;
  textDe: string;
  a: string;
  aEn: string;
  aDe: string;
  b: string;
  bEn: string;
  bDe: string;
  c: string;
  cEn: string;
  cDe: string;
  r: string;
  media: string;
  categories: string[];
  score: number;
  questionSource: string;
  relationToSafety: string;
  whatWeWantToAskFor: string;
  explanationTesty360: string;
  explanationGpt3: {
    shortExplanation: string;
    longExplanation: string;
    singleSentenceExplanation: string; // this is based on longExplanation first sentence
    textSeo: string;
  };
  explanation_1: string;
  answerBecause: string;
  deprecated_expl: any;
  deprecated_lowNameOld: any;
  deprecated_lowName: any;
  deprecated_lowNames: any;
  deprecated_low: any;
}

export interface QuestionBigObj {
  questionsBigCount: number;
  categoriesObj: CategoriesObj;
  questionsBig: QuestionBig[];
}

export interface QuestionBigObjMichal {
  questionsBigCount: number;
  questionsBig: QuestionBig[];
}

export interface QuestionSmall {
  slug: string;
  isActive: boolean;

  id: string;
  text: string;
  a: string;
  b: string;
  c: string;
  r: string;
  media: string;
  categories: string[];
  score: number;
}

export interface QuestionSmallObj {
  questionsSmallCount: number;
  categoriesObj: CategoriesObj;
  questionsSmall: QuestionSmall[];
}

export interface CategoriesObj {
  categoriesCount: number;
  categories: string[];
  categoriesWithCount: { [key: string]: number };
}

export interface ExamData {
  examName: string;
  examSlug: string;
  examCategory: string;
  minPointsToPass: number;
  allPossiblePoints: number;
  examQuestions32: QuestionSmall[];
}

export interface ExamDataObj {
  examsCount: number;
  exams: ExamData[];
}
