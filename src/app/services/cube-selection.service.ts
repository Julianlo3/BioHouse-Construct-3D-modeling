import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CubeSelectionService {
  private selectCubeSubject = new Subject<void>();
  selectCube$ = this.selectCubeSubject.asObservable();

  private raycasterActiveSubject = new BehaviorSubject<boolean>(false);
  raycasterActive$ = this.raycasterActiveSubject.asObservable();

  requestSelectCube(): void {
    this.selectCubeSubject.next();
  }

  setRaycasterActive(active: boolean): void {
    this.raycasterActiveSubject.next(active);
  }

  isRaycasterActive(): boolean {
    return this.raycasterActiveSubject.value;
  }
}
