import { Component } from '@angular/core';
import { Header } from '../header/header';
import { Footer } from '../footer/footer';
import { Details } from '../details/details';
import { ModelService } from '../model-service/model-service';

@Component({
  selector: 'app-page-welcome',
  imports: [Header,Footer,Details,ModelService],
  templateUrl: './page-welcome.html',
  styleUrl: './page-welcome.css',
})
export class PageWelcome {}
