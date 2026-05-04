import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig).catch((err) =>
    console.error(
        "Error arrancando la aplicación:",
        err instanceof Error ? err.message : err
    )
);
