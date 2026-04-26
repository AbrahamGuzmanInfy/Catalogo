import { TestBed } from '@angular/core/testing';
import { AppBottomNavComponent } from './app-bottom-nav.component';

describe('AppBottomNavComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppBottomNavComponent],
    })
      .overrideComponent(AppBottomNavComponent, {
        set: { template: '' },
      })
      .compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(AppBottomNavComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
