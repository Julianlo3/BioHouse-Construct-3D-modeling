import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActionsModel } from './actions-model';

describe('ActionsModel', () => {
  let component: ActionsModel;
  let fixture: ComponentFixture<ActionsModel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActionsModel],
    }).compileComponents();

    fixture = TestBed.createComponent(ActionsModel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
