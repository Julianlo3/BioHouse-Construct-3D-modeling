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

  private construirMuro = new Subject<void>();
  construirMuro$ = this.construirMuro.asObservable();

  private decorationActiveSubject = new BehaviorSubject<boolean>(false);
  decorationActive$ = this.decorationActiveSubject.asObservable();

  private addDecoration = new Subject<void>();
  addDecoration$ = this.addDecoration.asObservable();

  requestSelectCube(): void {
    this.selectCubeSubject.next();
  }

  setRaycasterActive(active: boolean): void {
    this.raycasterActiveSubject.next(active);
  }

  isRaycasterActive(): boolean {
    return this.raycasterActiveSubject.value;
  }

  requestConstruirMuro(): void {
    this.construirMuro.next();
  }

  setDecorationActive(active: boolean): void {
    this.decorationActiveSubject.next(active);
  }

  isDecorationActive(): boolean {
    return this.decorationActiveSubject.value;
  }

  requestAddDecoration(): void {
    this.addDecoration.next();
  }
}