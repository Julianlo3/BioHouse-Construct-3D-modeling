import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NavigationStateService {
  loadOldProject = signal(false);
}
