export enum QUESTION_TYPE {
  NUMBER = "number",
  STRING = "string",
  TEXTAREA = "textarea",
  DATE = "datetime", // Matches backend QUESTION_TYPE.DATE
  DROPDOWN = "dropdown",
  FILE = "file",
  MULTI = "multi"
}

// Validation rule interfaces
export interface StringValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

export interface NumberValidation {
  required?: boolean;
  minValue?: number;
  maxValue?: number;
}

export interface DatetimeValidation {
  required?: boolean;
  earliest?: string;
  latest?: string;
}

export interface DropdownValidation {
  required?: boolean;
  multiple?: boolean;
  minSelections?: number;
  maxSelections?: number;
}

export interface MultiValidation {
  required?: boolean;
  minSelections?: number;
  maxSelections?: number;
}

export interface FileValidation {
  required?: boolean;
  allowedTypes: string; // Comma separated MIME types e.g. "image/jpeg,application/pdf"
  maxSize: number; // Max size in MB
}

export type ValidationTypeMap = {
  [QUESTION_TYPE.STRING]: StringValidation;
  [QUESTION_TYPE.TEXTAREA]: StringValidation;
  [QUESTION_TYPE.NUMBER]: NumberValidation;
  [QUESTION_TYPE.DATE]: DatetimeValidation;
  [QUESTION_TYPE.DROPDOWN]: DropdownValidation;
  [QUESTION_TYPE.FILE]: FileValidation;
  [QUESTION_TYPE.MULTI]: MultiValidation;
};

// Base interface for all question types
interface BaseApplicationQuestion {
  id: string;
  order: number;
  text: string;
  placeholder?: string;
  state: APPLICATION_STATES;
  required?: boolean;
}

// Specific question type interfaces for creating a discriminated union
export interface StringApplicationQuestion extends BaseApplicationQuestion {
  type: QUESTION_TYPE.STRING;
  validation?: StringValidation;
}

export interface TextareaApplicationQuestion extends BaseApplicationQuestion {
  type: QUESTION_TYPE.TEXTAREA;
  validation?: StringValidation;
}

export interface NumberApplicationQuestion extends BaseApplicationQuestion {
  type: QUESTION_TYPE.NUMBER;
  validation?: NumberValidation;
}

export interface DateApplicationQuestion extends BaseApplicationQuestion {
  type: QUESTION_TYPE.DATE;
  validation?: DatetimeValidation;
}

export interface DropdownApplicationQuestion extends BaseApplicationQuestion {
  type: QUESTION_TYPE.DROPDOWN;
  options: string[];
  multiple?: boolean;
  validation?: DropdownValidation;
}

export interface FileApplicationQuestion extends BaseApplicationQuestion {
  type: QUESTION_TYPE.FILE;
  validation: FileValidation;
}

export interface MultiApplicationQuestion extends BaseApplicationQuestion {
  type: QUESTION_TYPE.MULTI;
  options: string[];
  validation?: MultiValidation;
}

export type ApplicationQuestion =
  | StringApplicationQuestion
  | TextareaApplicationQuestion
  | NumberApplicationQuestion
  | DateApplicationQuestion
  | DropdownApplicationQuestion
  | FileApplicationQuestion
  | MultiApplicationQuestion;

export enum APPLICATION_STATUS {
  NOT_APPLICABLE = "not applicable",
  DRAFT = "draft",
  SUBMITTED = "submitted",
  WAITLISTED = "waitlisted",
  REJECTED = "rejected",
  ACCEPTED = "accepted",
  CONFIRMED_RSVP = "confirmed rsvp",
}

export enum APPLICATION_STATES {
  PROFILE = "PROFILE",
  TEAM = "TEAM",
  SPEED_DATING = "SPEED_DATING",
  APPLICATION = "APPLICATION",
  LOGISTICAL_DETAIL = "LOGISTICAL_DETAIL",
  EMERGENCY_AND_CONSENT = "EMERGENCY_AND_CONSENT",
  ADDITIONAL_QUESTION = "ADDITIONAL_QUESTION",
}
