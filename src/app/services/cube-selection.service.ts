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

  private blockSizeSubject = new BehaviorSubject<'full' | 'half'>('full');
  blockSize$ = this.blockSizeSubject.asObservable();

  private decorationActiveSubject = new BehaviorSubject<boolean>(false);
  decorationActive$ = this.decorationActiveSubject.asObservable();

  private opacitySubject = new BehaviorSubject<number>(1);
  opacity$ = this.opacitySubject.asObservable();

  private addDecoration = new Subject<string>();
  addDecoration$ = this.addDecoration.asObservable();

  private saveModel = new Subject<void>();
  saveModel$ = this.saveModel.asObservable();

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

  setOpacity(opacity: number): void {
    this.opacitySubject.next(opacity);
  }

  requestAddDecoration(decorationType: string): void {
    this.addDecoration.next(decorationType);
  }

  setBlockSize(size: 'full' | 'half'): void {
    this.blockSizeSubject.next(size);
  }

  getBlockSize(): 'full' | 'half' {
    return this.blockSizeSubject.value;
  }

  requestSaveModel(): void {
    this.saveModel.next();
  }
}