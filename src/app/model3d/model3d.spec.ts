import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Model3d } from './model3d';

describe('Model3d', () => {
  let component: Model3d;
  let fixture: ComponentFixture<Model3d>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Model3d],
    }).compileComponents();

    fixture = TestBed.createComponent(Model3d);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
