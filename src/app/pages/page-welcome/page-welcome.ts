import { Component } from '@angular/core';
import { Header } from '../../layout/header/header';
import { Footer } from '../../layout/footer/footer';
import { Details } from '../../layout/details/details';
import { InfoTools } from '../../layout/info-tools/info-tools';

@Component({
  selector: 'app-page-welcome',
  imports: [Header,Footer,Details,InfoTools],
  templateUrl: './page-welcome.html',
  styleUrl: './page-welcome.css',
})
export class PageWelcome {}
