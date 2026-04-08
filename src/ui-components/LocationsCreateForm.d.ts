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
export declare type LocationsCreateFormInputValues = {};
export declare type LocationsCreateFormValidationValues = {};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type LocationsCreateFormOverridesProps = {
    LocationsCreateFormGrid?: PrimitiveOverrideProps<GridProps>;
} & EscapeHatchProps;
export declare type LocationsCreateFormProps = React.PropsWithChildren<{
    overrides?: LocationsCreateFormOverridesProps | undefined | null;
} & {
    clearOnSuccess?: boolean;
    onSubmit?: (fields: LocationsCreateFormInputValues) => LocationsCreateFormInputValues;
    onSuccess?: (fields: LocationsCreateFormInputValues) => void;
    onError?: (fields: LocationsCreateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: LocationsCreateFormInputValues) => LocationsCreateFormInputValues;
    onValidate?: LocationsCreateFormValidationValues;
} & React.CSSProperties>;
export default function LocationsCreateForm(props: LocationsCreateFormProps): React.ReactElement;
