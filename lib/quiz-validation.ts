import { QuestionType } from "@/lib/question-type";

export type QuizOptionInput = {
  text: string;
  isCorrect: boolean;
};

export type QuizQuestionInput = {
  question: string;
  explanation?: string | null;
  questionType?: QuestionType | string;
  options: QuizOptionInput[];
};

function normalizeQuestionType(
  questionType?: QuestionType | string
): QuestionType {
  if (
    questionType === QuestionType.multiple ||
    questionType === QuestionType.essay ||
    questionType === QuestionType.assessment
  ) {
    return questionType;
  }
  return QuestionType.single;
}

export function validateQuizQuestions(
  questions: QuizQuestionInput[]
): string | null {
  for (const question of questions) {
    const questionType = normalizeQuestionType(question.questionType);

    if (!question.question?.trim()) {
      return "Each question must have text";
    }

    if (
      questionType === QuestionType.essay ||
      questionType === QuestionType.assessment
    ) {
      if (questionType === QuestionType.assessment) {
        if (!Array.isArray(question.options) || question.options.length < 2) {
          return "Assessment questions must have at least 2 options";
        }
        for (const option of question.options) {
          if (!option.text?.trim()) {
            return "Option text cannot be empty";
          }
        }
      }
      continue;
    }

    if (!Array.isArray(question.options) || question.options.length < 2) {
      return "Each question must have at least 2 options";
    }

    const hasCorrect = question.options.some((opt) => opt.isCorrect);
    if (!hasCorrect) {
      return "Each question must have a correct answer";
    }

    for (const option of question.options) {
      if (!option.text?.trim()) {
        return "Option text cannot be empty";
      }
    }
  }

  return null;
}

export function normalizeQuizQuestionType(
  questionType?: QuestionType | string
): QuestionType {
  return normalizeQuestionType(questionType);
}
