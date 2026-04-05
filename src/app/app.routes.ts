import { Routes } from '@angular/router';
import { Start } from './pages/start/start';
import { PageWelcome } from './pages/page-welcome/page-welcome';

export const routes: Routes = [
  { path: '', component: PageWelcome},
  { path: 'model', component: Start}
];
