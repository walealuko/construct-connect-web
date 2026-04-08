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
export declare type SellersUpdateFormInputValues = {};
export declare type SellersUpdateFormValidationValues = {};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type SellersUpdateFormOverridesProps = {
    SellersUpdateFormGrid?: PrimitiveOverrideProps<GridProps>;
} & EscapeHatchProps;
export declare type SellersUpdateFormProps = React.PropsWithChildren<{
    overrides?: SellersUpdateFormOverridesProps | undefined | null;
} & {
    id?: string;
    sellers?: any;
    onSubmit?: (fields: SellersUpdateFormInputValues) => SellersUpdateFormInputValues;
    onSuccess?: (fields: SellersUpdateFormInputValues) => void;
    onError?: (fields: SellersUpdateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: SellersUpdateFormInputValues) => SellersUpdateFormInputValues;
    onValidate?: SellersUpdateFormValidationValues;
} & React.CSSProperties>;
export default function SellersUpdateForm(props: SellersUpdateFormProps): React.ReactElement;
