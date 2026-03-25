import { Routes } from '@angular/router';
import { Start } from './start/start';
import { PageWelcome } from './page-welcome/page-welcome';

export const routes: Routes = [
  { path: '', component: PageWelcome},
  { path: 'model', component: Start}
];
