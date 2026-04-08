/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

import * as React from "react";
import { GridProps } from "@aws-amplify/ui-react";
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
export declare type ArtisansCreateFormInputValues = {};
export declare type ArtisansCreateFormValidationValues = {};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type ArtisansCreateFormOverridesProps = {
    ArtisansCreateFormGrid?: PrimitiveOverrideProps<GridProps>;
} & EscapeHatchProps;
export declare type ArtisansCreateFormProps = React.PropsWithChildren<{
    overrides?: ArtisansCreateFormOverridesProps | undefined | null;
} & {
    clearOnSuccess?: boolean;
    onSubmit?: (fields: ArtisansCreateFormInputValues) => ArtisansCreateFormInputValues;
    onSuccess?: (fields: ArtisansCreateFormInputValues) => void;
    onError?: (fields: ArtisansCreateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: ArtisansCreateFormInputValues) => ArtisansCreateFormInputValues;
    onValidate?: ArtisansCreateFormValidationValues;
} & React.CSSProperties>;
export default function ArtisansCreateForm(props: ArtisansCreateFormProps): React.ReactElement;
