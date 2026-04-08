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
export declare type SellersCreateFormInputValues = {};
export declare type SellersCreateFormValidationValues = {};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type SellersCreateFormOverridesProps = {
    SellersCreateFormGrid?: PrimitiveOverrideProps<GridProps>;
} & EscapeHatchProps;
export declare type SellersCreateFormProps = React.PropsWithChildren<{
    overrides?: SellersCreateFormOverridesProps | undefined | null;
} & {
    clearOnSuccess?: boolean;
    onSubmit?: (fields: SellersCreateFormInputValues) => SellersCreateFormInputValues;
    onSuccess?: (fields: SellersCreateFormInputValues) => void;
    onError?: (fields: SellersCreateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: SellersCreateFormInputValues) => SellersCreateFormInputValues;
    onValidate?: SellersCreateFormValidationValues;
} & React.CSSProperties>;
export default function SellersCreateForm(props: SellersCreateFormProps): React.ReactElement;
