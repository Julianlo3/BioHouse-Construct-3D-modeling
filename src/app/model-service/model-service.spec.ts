import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModelService } from './model-service';

describe('ModelService', () => {
  let component: ModelService;
  let fixture: ComponentFixture<ModelService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModelService],
    }).compileComponents();

    fixture = TestBed.createComponent(ModelService);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
