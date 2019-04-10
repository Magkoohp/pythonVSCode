// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
'use strict';
import * as React from 'react';

import { CssMessages, IGetCssResponse, SharedMessages } from '../../client/datascience/constants';
import { IDataScienceExtraSettings } from '../../client/datascience/types';
import { IMessageHandler, PostOffice } from './postOffice';
import { detectBaseTheme } from './themeDetector';

export interface IStyleInjectorProps {
    expectingDark: boolean;
    darkChanged?(newDark: boolean): void;
}

interface IStyleInjectorState {
    rootCss?: string;
    theme?: string;
    knownDark?: boolean;
}

export class StyleInjector extends React.Component<IStyleInjectorProps, IStyleInjectorState> implements IMessageHandler {

    constructor(props: IStyleInjectorProps) {
        super(props);
        this.state = { rootCss: undefined, theme: undefined };
    }

    public componentWillMount() {
        // Add ourselves as a handler for the post office
        PostOffice.addHandler(this);
    }

    public componentWillUnmount() {
        // Remove ourselves as a handler for the post office
        PostOffice.removeHandler(this);
    }

    public componentDidMount() {
        if (!this.state.rootCss) {
            // Set to a temporary value.
            this.setState({rootCss: ' '});
            PostOffice.sendUnsafeMessage(CssMessages.GetCssRequest, { isDark: this.props.expectingDark });
        }
    }

    public render() {
        return (
            <div className='styleSetter'>
                <style>
                    {this.state.rootCss}
                </style>
                {this.props.children}
            </div>
        );
    }

    // tslint:disable-next-line:no-any
    public handleMessage = (msg: string, payload?: any) : boolean => {
        switch (msg) {
            case CssMessages.GetCssResponse:
                this.handleResponse(payload);
                break;

            case SharedMessages.UpdateSettings:
                this.updateSettings(payload);
                break;

            default:
                break;
        }

        return true;
    }

    // tslint:disable-next-line:no-any
    private handleResponse(payload?: any) {
        const response = payload as IGetCssResponse;
        if (response && response.css) {

            // Recompute our known dark value from the class name in the body
            // VS code should update this dynamically when the theme changes
            const computedKnownDark = this.computeKnownDark();

            // We also get this in our response, but computing is more reliable
            // than searching for it.

            if (this.state.knownDark !== computedKnownDark &&
                this.props.darkChanged) {
                this.props.darkChanged(computedKnownDark);
            }

            this.setState({
                rootCss: response.css,
                theme: response.theme,
                knownDark: computedKnownDark
            });
        }
    }

    // tslint:disable-next-line:no-any
    private updateSettings(payload: any) {
        if (payload) {
            const newSettings = JSON.parse(payload as string);
            const dsSettings = newSettings as IDataScienceExtraSettings;
            if (dsSettings && dsSettings.extraSettings && dsSettings.extraSettings.theme !== this.state.theme) {
                // User changed the current theme. Rerender
                PostOffice.sendUnsafeMessage(CssMessages.GetCssRequest, { isDark: this.computeKnownDark() });
            }
        }
    }

    private computeKnownDark() : boolean {
        const baseTheme = detectBaseTheme();
        return baseTheme !== 'vscode-light';
    }
}
