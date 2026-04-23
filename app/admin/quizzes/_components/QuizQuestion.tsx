"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, Plus, Save, Trash } from "lucide-react";

export type Option = {
  id: string;
  text: string;
  isCorrect: boolean;
};

type QuizQuestionData = {
  question: string;
  explanation: string;
  options: Option[];
};

type QuizQuestionProps = {
  questionIndex: number;
  value: QuizQuestionData;
  onChange: (data: QuizQuestionData) => void;
  onSave?: (data: QuizQuestionData) => void;
};

export function QuizQuestion({
  questionIndex,
  value,
  onChange,
  onSave,
}: QuizQuestionProps) {
  function handleQuestionChange(question: string) {
    onChange({
      ...value,
      question,
    });
  }

  function handleExplanationChange(explanation: string) {
    onChange({
      ...value,
      explanation,
    });
  }

  function handleOptionChange(id: string, text: string) {
    const updatedOptions = value.options.map((option) =>
      option.id === id ? { ...option, text } : option
    );

    onChange({
      ...value,
      options: updatedOptions,
    });
  }

  function toggleCorrect(id: string) {
    const updatedOptions = value.options.map((option) => ({
      ...option,
      isCorrect: option.id === id,
    }));

    onChange({
      ...value,
      options: updatedOptions,
    });
  }

  function addOption() {
    onChange({
      ...value,
      options: [
        ...value.options,
        {
          id: crypto.randomUUID(),
          text: "",
          isCorrect: false,
        },
      ],
    });
  }

  function removeOption(id: string) {
    if (value.options.length <= 2) return;

    const updatedOptions = value.options.filter((option) => option.id !== id);

    onChange({
      ...value,
      options: updatedOptions,
    });
  }

  function handleSave() {
    onSave?.(value);
  }

  const isSaveDisabled =
    !value.question.trim() ||
    value.options.some((option) => !option.text.trim()) ||
    !value.options.some((option) => option.isCorrect);

  return (
    <div className="space-y-5 rounded-xl border p-4">
      <div className="flex items-center justify-between border-b pb-3">
        <h3 className="text-base font-semibold">Question {questionIndex + 1}</h3>

        <Button type="button" onClick={handleSave} disabled={isSaveDisabled}>
          <Save className="mr-2 size-4" />
          Save Question
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`question-${questionIndex}`}>Question text</Label>
        <Textarea
          id={`question-${questionIndex}`}
          placeholder="Enter your question"
          value={value.question}
          onChange={(e) => handleQuestionChange(e.target.value)}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`explanation-${questionIndex}`}>
          Explanation (optional)
        </Label>
        <Textarea
          id={`explanation-${questionIndex}`}
          placeholder="Add an explanation for the correct answer"
          value={value.explanation}
          onChange={(e) => handleExplanationChange(e.target.value)}
          rows={4}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Options</Label>

          <Button type="button" variant="outline" onClick={addOption}>
            <Plus className="mr-2 size-4" />
            Add Option
          </Button>
        </div>

        {value.options.map((option, index) => (
          <div
            key={option.id}
            className="flex items-center gap-2 rounded-lg border p-3"
          >
            <Input
              placeholder={`Option ${String.fromCharCode(65 + index)}`}
              value={option.text}
              onChange={(e) => handleOptionChange(option.id, e.target.value)}
            />

            <Button
              type="button"
              variant={option.isCorrect ? "default" : "outline"}
              size="icon"
              onClick={() => toggleCorrect(option.id)}
              title="Mark as correct answer"
            >
              <CheckCircle className="size-4" />
            </Button>

            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={() => removeOption(option.id)}
              disabled={value.options.length <= 2}
            >
              <Trash className="size-4" />
            </Button>
          </div>
        ))}

        <p className="text-xs text-muted-foreground">
          Select exactly one correct option for each question.
        </p>
      </div>
    </div>
  );
}