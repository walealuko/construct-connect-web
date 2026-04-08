/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

import * as React from "react";
import { GridProps, TextFieldProps } from "@aws-amplify/ui-react";
export declare type EscapeHatchProps = {
    [elementHierarchy: string]: Record<string, unknown>;
} | null;
export declare type VariantValues = {
    [key: string]: string;
};
export declare type Variant = {
    variantValues: VariantValues;
    overrides: EscapeHatchProps;
};
export declare type ValidationResponse = {
    hasError: boolean;
    errorMessage?: string;
};
export declare type ValidationFunction<T> = (value: T, validationResponse: ValidationResponse) => ValidationResponse | Promise<ValidationResponse>;
export declare type ReviewsUpdateFormInputValues = {
    untitledfield?: string;
};
export declare type ReviewsUpdateFormValidationValues = {
    untitledfield?: ValidationFunction<string>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type ReviewsUpdateFormOverridesProps = {
    ReviewsUpdateFormGrid?: PrimitiveOverrideProps<GridProps>;
    untitledfield?: PrimitiveOverrideProps<TextFieldProps>;
} & EscapeHatchProps;
export declare type ReviewsUpdateFormProps = React.PropsWithChildren<{
    overrides?: ReviewsUpdateFormOverridesProps | undefined | null;
} & {
    id?: string;
    reviews?: any;
    onSubmit?: (fields: ReviewsUpdateFormInputValues) => ReviewsUpdateFormInputValues;
    onSuccess?: (fields: ReviewsUpdateFormInputValues) => void;
    onError?: (fields: ReviewsUpdateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: ReviewsUpdateFormInputValues) => ReviewsUpdateFormInputValues;
    onValidate?: ReviewsUpdateFormValidationValues;
} & React.CSSProperties>;
export default function ReviewsUpdateForm(props: ReviewsUpdateFormProps): React.ReactElement;
