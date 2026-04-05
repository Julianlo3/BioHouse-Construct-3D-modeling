import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PageWelcome } from './page-welcome';

describe('PageWelcome', () => {
  let component: PageWelcome;
  let fixture: ComponentFixture<PageWelcome>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageWelcome],
    }).compileComponents();

    fixture = TestBed.createComponent(PageWelcome);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
