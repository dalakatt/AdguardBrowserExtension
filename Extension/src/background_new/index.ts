import { messageHandler } from './message-handler';
import { UiService } from './services/ui-service';
import { PopupService } from './services/popup-service';
import { SettingsService } from './services/settings/settings-service';

SettingsService.init();
UiService.init();
PopupService.init();

messageHandler.init();
