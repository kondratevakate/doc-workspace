import type { AppLocale, AppMode } from '@/src/lib/preferences';

type TranslationKey =
  | 'common.language'
  | 'common.mode'
  | 'common.english'
  | 'common.russian'
  | 'common.notSet'
  | 'common.due'
  | 'common.priorityBadge'
  | 'common.open'
  | 'common.demo'
  | 'common.main'
  | 'common.physician'
  | 'common.draftNumber'
  | 'auth.eyebrow'
  | 'auth.title'
  | 'auth.description'
  | 'auth.demoEyebrow'
  | 'auth.demoTitle'
  | 'auth.demoDescription'
  | 'auth.demoNotice'
  | 'auth.physicianEmail'
  | 'auth.preparingLink'
  | 'auth.requestMagicLink'
  | 'auth.enterDemo'
  | 'auth.resetDemoData'
  | 'auth.magicLinkGenerated'
  | 'auth.magicLinkRequested'
  | 'auth.requestMagicLinkError'
  | 'auth.developmentLinkNotice'
  | 'auth.open'
  | 'nav.today'
  | 'nav.capture'
  | 'nav.drafts'
  | 'nav.cohort'
  | 'shell.logOut'
  | 'shell.resetDemo'
  | 'shell.demoActive'
  | 'today.title'
  | 'today.dailyPosture'
  | 'today.launchPack'
  | 'today.dueToday'
  | 'today.overdue'
  | 'today.nonResponder'
  | 'today.drafts'
  | 'today.noNextStep'
  | 'today.loadingWorkspace'
  | 'today.loadingQueues'
  | 'today.noCasesDueToday'
  | 'today.noOverdueCases'
  | 'today.noNonResponderCases'
  | 'today.everyCaseHasNextStep'
  | 'today.draftsUnresolved'
  | 'today.reviewQueue'
  | 'today.transcriptPending'
  | 'today.noUnresolvedDrafts'
  | 'today.refreshQueues'
  | 'today.loadQueuesError'
  | 'drafts.title'
  | 'drafts.subtitle'
  | 'drafts.loading'
  | 'drafts.unresolved'
  | 'drafts.openDraft'
  | 'drafts.noUnresolved'
  | 'drafts.loadError'
  | 'cohort.title'
  | 'cohort.subtitle'
  | 'cohort.loading'
  | 'cohort.preparing'
  | 'cohort.responseDistribution'
  | 'cohort.clinicalPosture'
  | 'cohort.migraineBuckets'
  | 'cohort.diseaseSlices'
  | 'cohort.recentCases'
  | 'cohort.latestActivity'
  | 'cohort.noCommittedCases'
  | 'cohort.loadError'
  | 'capture.title'
  | 'capture.subtitle'
  | 'capture.loading'
  | 'capture.newNote'
  | 'capture.voiceCapture'
  | 'capture.description'
  | 'capture.startRecording'
  | 'capture.stopRecording'
  | 'capture.uploadAudio'
  | 'capture.recordingInProgress'
  | 'capture.browserRecordingUnavailable'
  | 'capture.uploadingVoice'
  | 'capture.voiceReceived'
  | 'capture.uploadVoiceError'
  | 'capture.loadDraftError'
  | 'capture.refreshDraftError'
  | 'capture.draftReady'
  | 'capture.draftNeedsReview'
  | 'capture.transcriptProcessing'
  | 'capture.summary'
  | 'capture.nextFollowupDue'
  | 'capture.newCase'
  | 'capture.existingCase'
  | 'capture.attachToCase'
  | 'capture.commitDraft'
  | 'capture.caseSaved'
  | 'capture.commitDraftError'
  | 'capture.tapToRecord'
  | 'capture.startCaptureHint'
  | 'capture.tapToStop'
  | 'capture.processingAudio'
  | 'capture.recordAgain'
  | 'capture.reviewDraft'
  | 'capture.quickInput'
  | 'capture.backToVoice'
  | 'capture.visitType'
  | 'capture.visitPrimary'
  | 'capture.visitFollowup'
  | 'capture.patientInitial'
  | 'capture.discussed'
  | 'capture.nextVisit'
  | 'capture.in1Week'
  | 'capture.in2Weeks'
  | 'capture.in1Month'
  | 'capture.in3Months'
  | 'case.titleFallback'
  | 'case.subtitle'
  | 'case.loading'
  | 'case.preparing'
  | 'case.loadError'
  | 'case.openTasks'
  | 'case.followUp'
  | 'case.noOpenTasks'
  | 'case.taskLine'
  | 'case.updates'
  | 'case.evidenceTrail'
  | 'case.transcriptUnavailable'
  | 'case.addAnotherUpdate'
  | 'reviewState.ready'
  | 'reviewState.needs_review'
  | 'reviewState.committed'
  | 'priority.high'
  | 'priority.medium'
  | 'priority.low'
  | 'task.follow_up';

const messages: Record<AppLocale, Record<TranslationKey, string>> = {
  en: {
    'common.language': 'Language',
    'common.mode': 'Mode',
    'common.english': 'EN',
    'common.russian': 'RU',
    'common.notSet': 'Not set',
    'common.due': 'Due {date}',
    'common.priorityBadge': '{priority} priority',
    'common.open': 'Open',
    'common.demo': 'Demo',
    'common.main': 'Live',
    'common.physician': 'Physician',
    'common.draftNumber': 'Draft #{id}',
    'auth.eyebrow': 'UAE physician workspace',
    'auth.title': 'Secure case follow-up, built for the phone.',
    'auth.description': 'This workspace stores voice drafts, case cards, and follow-up queues in the secured web application, not in a messenger thread.',
    'auth.demoEyebrow': 'Demo mode',
    'auth.demoTitle': 'Local physician walkthrough, no authentication required.',
    'auth.demoDescription': 'Demo uses local fixtures and does not call backend auth or API endpoints.',
    'auth.demoNotice': 'Use this mode to demo Today, Capture, Drafts, Cohort, and Case detail flows without starting the backend.',
    'auth.physicianEmail': 'Physician email',
    'auth.preparingLink': 'Preparing link...',
    'auth.requestMagicLink': 'Request magic link',
    'auth.enterDemo': 'Enter demo workspace',
    'auth.resetDemoData': 'Reset demo data',
    'auth.magicLinkGenerated': 'Development magic link generated.',
    'auth.magicLinkRequested': 'Magic link requested. Check the physician inbox.',
    'auth.requestMagicLinkError': 'Could not request magic link.',
    'auth.developmentLinkNotice': 'Development mode is returning the verification link directly so you can continue without email delivery.',
    'auth.open': 'Open',
    'nav.today': 'Today',
    'nav.capture': 'Capture',
    'nav.drafts': 'Drafts',
    'nav.cohort': 'Cohort',
    'shell.logOut': 'Log out',
    'shell.resetDemo': 'Reset demo',
    'shell.demoActive': 'Demo mode',
    'today.title': 'Today',
    'today.dailyPosture': 'Daily posture',
    'today.launchPack': 'Launch pack',
    'today.dueToday': 'Due today',
    'today.overdue': 'Overdue',
    'today.nonResponder': 'Non-responder',
    'today.drafts': 'Drafts',
    'today.noNextStep': 'No next step',
    'today.loadingWorkspace': 'Loading physician workspace...',
    'today.loadingQueues': 'Loading today queues...',
    'today.noCasesDueToday': 'No cases due today.',
    'today.noOverdueCases': 'No overdue cases.',
    'today.noNonResponderCases': 'No non-responder cases right now.',
    'today.everyCaseHasNextStep': 'Every open case has a next step.',
    'today.draftsUnresolved': 'Drafts unresolved',
    'today.reviewQueue': 'Review queue',
    'today.transcriptPending': 'Transcript pending.',
    'today.noUnresolvedDrafts': 'No unresolved drafts.',
    'today.refreshQueues': 'Refresh queues',
    'today.loadQueuesError': 'Could not load queues.',
    'drafts.title': 'Drafts',
    'drafts.subtitle': 'Voice captures stay here until they are committed into a canonical case.',
    'drafts.loading': 'Loading drafts...',
    'drafts.unresolved': 'Unresolved drafts',
    'drafts.openDraft': 'Open draft',
    'drafts.noUnresolved': 'No unresolved drafts. Fresh captures will appear here until committed.',
    'drafts.loadError': 'Could not load drafts.',
    'cohort.title': 'Cohort',
    'cohort.subtitle': 'Lightweight cohort view for fast review, not a heavy registry.',
    'cohort.loading': 'Loading cohort...',
    'cohort.preparing': 'Preparing cohort summary...',
    'cohort.responseDistribution': 'Response distribution',
    'cohort.clinicalPosture': 'Clinical posture',
    'cohort.migraineBuckets': 'Migraine buckets',
    'cohort.diseaseSlices': 'Disease slices',
    'cohort.recentCases': 'Recent cases',
    'cohort.latestActivity': 'Latest activity',
    'cohort.noCommittedCases': 'No committed cases yet.',
    'cohort.loadError': 'Could not load cohort summary.',
    'capture.title': 'Capture',
    'capture.subtitle': 'Record directly in the workspace. Messenger transport is deliberately out of scope.',
    'capture.loading': 'Loading capture workspace...',
    'capture.newNote': 'New note',
    'capture.voiceCapture': 'Voice capture',
    'capture.description': 'Capture one longitudinal update. The canonical case is created or updated only after review and commit.',
    'capture.startRecording': 'Start recording',
    'capture.stopRecording': 'Stop recording',
    'capture.uploadAudio': 'Upload audio',
    'capture.recordingInProgress': 'Recording in progress',
    'capture.browserRecordingUnavailable': 'Recording is not available in this browser. Use the upload fallback.',
    'capture.uploadingVoice': 'Uploading voice note...',
    'capture.voiceReceived': 'Voice note received. Building draft...',
    'capture.uploadVoiceError': 'Could not upload voice note.',
    'capture.loadDraftError': 'Could not load draft.',
    'capture.refreshDraftError': 'Could not refresh draft status.',
    'capture.draftReady': 'Draft ready for review.',
    'capture.draftNeedsReview': 'Draft needs review before commit.',
    'capture.transcriptProcessing': 'Transcript is still processing.',
    'capture.summary': 'Summary',
    'capture.nextFollowupDue': 'Next follow-up due',
    'capture.newCase': 'New case',
    'capture.existingCase': 'Existing case',
    'capture.attachToCase': 'Attach to case',
    'capture.commitDraft': 'Commit draft',
    'capture.caseSaved': 'Case {caseToken} saved.',
    'capture.commitDraftError': 'Could not commit draft.',
    'capture.tapToRecord': 'Tap to dictate',
    'capture.startCaptureHint': 'Start capturing session notes',
    'capture.tapToStop': 'Tap to stop',
    'capture.processingAudio': 'Processing audio...',
    'capture.recordAgain': 'Record again',
    'capture.reviewDraft': 'Review draft',
    'capture.quickInput': 'Quick Input',
    'capture.backToVoice': 'Back to voice',
    'capture.visitType': 'Visit type',
    'capture.visitPrimary': 'Primary',
    'capture.visitFollowup': 'Follow-up',
    'capture.patientInitial': 'Patient initial',
    'capture.discussed': 'Discussed',
    'capture.nextVisit': 'Next visit',
    'capture.in1Week': '1 week',
    'capture.in2Weeks': '2 weeks',
    'capture.in1Month': '1 month',
    'capture.in3Months': '3 months',
    'case.titleFallback': 'Case',
    'case.subtitle': 'Canonical case card with updates and task evidence.',
    'case.loading': 'Loading case...',
    'case.preparing': 'Preparing case detail...',
    'case.loadError': 'Could not load case detail.',
    'case.openTasks': 'Open tasks',
    'case.followUp': 'Follow-up',
    'case.noOpenTasks': 'No open tasks.',
    'case.taskLine': '{taskType} - due {dueAt} - {priority}',
    'case.updates': 'Case updates',
    'case.evidenceTrail': 'Evidence trail',
    'case.transcriptUnavailable': 'Transcript unavailable.',
    'case.addAnotherUpdate': 'Add another update',
    'reviewState.ready': 'ready',
    'reviewState.needs_review': 'needs review',
    'reviewState.committed': 'committed',
    'priority.high': 'High',
    'priority.medium': 'Medium',
    'priority.low': 'Low',
    'task.follow_up': 'Follow-up'
  },
  ru: {
    'common.language': 'Язык',
    'common.mode': 'Режим',
    'common.english': 'EN',
    'common.russian': 'RU',
    'common.notSet': 'Не указано',
    'common.due': 'Срок {date}',
    'common.priorityBadge': '{priority} приоритет',
    'common.open': 'Открыть',
    'common.demo': 'Демо',
    'common.main': 'Основной',
    'common.physician': 'Врач',
    'common.draftNumber': 'Драфт #{id}',
    'auth.eyebrow': 'Рабочее место врача',
    'auth.title': 'Безопасное ведение кейсов, рассчитанное на телефон.',
    'auth.description': 'Голосовые драфты, карточки кейсов и очереди наблюдения хранятся в защищённом веб-приложении, а не в мессенджере.',
    'auth.demoEyebrow': 'Демо-режим',
    'auth.demoTitle': 'Локальный walkthrough для врача без аутентификации.',
    'auth.demoDescription': 'Демо использует локальные фикстуры и не обращается к backend auth или API.',
    'auth.demoNotice': 'Используй этот режим, чтобы показать Today, Capture, Drafts, Cohort и Case detail без запуска backend.',
    'auth.physicianEmail': 'Email врача',
    'auth.preparingLink': 'Готовлю ссылку...',
    'auth.requestMagicLink': 'Запросить magic link',
    'auth.enterDemo': 'Войти в демо',
    'auth.resetDemoData': 'Сбросить демо-данные',
    'auth.magicLinkGenerated': 'Сгенерирована development magic link.',
    'auth.magicLinkRequested': 'Magic link запрошена. Проверь почту врача.',
    'auth.requestMagicLinkError': 'Не удалось запросить magic link.',
    'auth.developmentLinkNotice': 'В development-режиме ссылка верификации возвращается сразу, так что можно продолжить без доставки письма.',
    'auth.open': 'Открыть',
    'nav.today': 'Сегодня',
    'nav.capture': 'Запись',
    'nav.drafts': 'Драфты',
    'nav.cohort': 'Когорта',
    'shell.logOut': 'Выйти',
    'shell.resetDemo': 'Сбросить демо',
    'shell.demoActive': 'Демо-режим',
    'today.title': 'Сегодня',
    'today.dailyPosture': 'Срез дня',
    'today.launchPack': 'Стартовый пакет',
    'today.dueToday': 'На сегодня',
    'today.overdue': 'Просрочено',
    'today.nonResponder': 'Нет ответа',
    'today.drafts': 'Драфты',
    'today.noNextStep': 'Нет следующего шага',
    'today.loadingWorkspace': 'Загружаю рабочее место врача...',
    'today.loadingQueues': 'Загружаю очереди на сегодня...',
    'today.noCasesDueToday': 'На сегодня кейсов нет.',
    'today.noOverdueCases': 'Просроченных кейсов нет.',
    'today.noNonResponderCases': 'Сейчас нет кейсов без ответа.',
    'today.everyCaseHasNextStep': 'У каждого открытого кейса есть следующий шаг.',
    'today.draftsUnresolved': 'Неразобранные драфты',
    'today.reviewQueue': 'Очередь на разбор',
    'today.transcriptPending': 'Транскрипт ещё готовится.',
    'today.noUnresolvedDrafts': 'Неразобранных драфтов нет.',
    'today.refreshQueues': 'Обновить очереди',
    'today.loadQueuesError': 'Не удалось загрузить очереди.',
    'drafts.title': 'Драфты',
    'drafts.subtitle': 'Голосовые записи остаются здесь, пока не будут закоммичены в канонический кейс.',
    'drafts.loading': 'Загружаю драфты...',
    'drafts.unresolved': 'Неразобранные драфты',
    'drafts.openDraft': 'Открыть драфт',
    'drafts.noUnresolved': 'Неразобранных драфтов нет. Новые записи будут появляться здесь до коммита.',
    'drafts.loadError': 'Не удалось загрузить драфты.',
    'cohort.title': 'Когорта',
    'cohort.subtitle': 'Лёгкий когортный обзор для быстрого просмотра, а не тяжёлый регистр.',
    'cohort.loading': 'Загружаю когорту...',
    'cohort.preparing': 'Готовлю сводку по когорте...',
    'cohort.responseDistribution': 'Распределение по ответу',
    'cohort.clinicalPosture': 'Клинический срез',
    'cohort.migraineBuckets': 'Категории мигрени',
    'cohort.diseaseSlices': 'Срезы по заболеванию',
    'cohort.recentCases': 'Последние кейсы',
    'cohort.latestActivity': 'Последняя активность',
    'cohort.noCommittedCases': 'Пока нет закоммиченных кейсов.',
    'cohort.loadError': 'Не удалось загрузить сводку по когорте.',
    'capture.title': 'Запись',
    'capture.subtitle': 'Записывай прямо в рабочем месте. Транспорт через мессенджер намеренно вне scope.',
    'capture.loading': 'Загружаю workspace записи...',
    'capture.newNote': 'Новая запись',
    'capture.voiceCapture': 'Голосовой захват',
    'capture.description': 'Сохрани одно продольное обновление. Канонический кейс создаётся или обновляется только после review и commit.',
    'capture.startRecording': 'Начать запись',
    'capture.stopRecording': 'Остановить запись',
    'capture.uploadAudio': 'Загрузить аудио',
    'capture.recordingInProgress': 'Идёт запись',
    'capture.browserRecordingUnavailable': 'Запись недоступна в этом браузере. Используй загрузку файла.',
    'capture.uploadingVoice': 'Загружаю голосовую заметку...',
    'capture.voiceReceived': 'Голосовая заметка получена. Собираю драфт...',
    'capture.uploadVoiceError': 'Не удалось загрузить голосовую заметку.',
    'capture.loadDraftError': 'Не удалось загрузить драфт.',
    'capture.refreshDraftError': 'Не удалось обновить статус драфта.',
    'capture.draftReady': 'Драфт готов к review.',
    'capture.draftNeedsReview': 'Драфту нужен review перед commit.',
    'capture.transcriptProcessing': 'Транскрипт ещё обрабатывается.',
    'capture.summary': 'Саммари',
    'capture.nextFollowupDue': 'Следующий срок follow-up',
    'capture.newCase': 'Новый кейс',
    'capture.existingCase': 'Существующий кейс',
    'capture.attachToCase': 'Привязать к кейсу',
    'capture.commitDraft': 'Закоммитить драфт',
    'capture.caseSaved': 'Кейс {caseToken} сохранён.',
    'capture.commitDraftError': 'Не удалось закоммитить драфт.',
    'capture.tapToRecord': 'Нажми для диктовки',
    'capture.startCaptureHint': 'Начни запись заметок',
    'capture.tapToStop': 'Нажми для остановки',
    'capture.processingAudio': 'Обработка аудио...',
    'capture.recordAgain': 'Записать снова',
    'capture.reviewDraft': 'Проверь драфт',
    'capture.quickInput': 'Быстрый ввод',
    'capture.backToVoice': 'Вернуться к голосу',
    'capture.visitType': 'Тип приёма',
    'capture.visitPrimary': 'Первичный',
    'capture.visitFollowup': 'Повторный',
    'capture.patientInitial': 'Инициал пациента',
    'capture.discussed': 'Обсуждали',
    'capture.nextVisit': 'Следующий визит',
    'capture.in1Week': '1 неделя',
    'capture.in2Weeks': '2 недели',
    'capture.in1Month': '1 месяц',
    'capture.in3Months': '3 месяца',
    'case.titleFallback': 'Кейс',
    'case.subtitle': 'Каноническая карточка кейса с обновлениями и следами задач.',
    'case.loading': 'Загружаю кейс...',
    'case.preparing': 'Готовлю детали кейса...',
    'case.loadError': 'Не удалось загрузить детали кейса.',
    'case.openTasks': 'Открытые задачи',
    'case.followUp': 'Наблюдение',
    'case.noOpenTasks': 'Открытых задач нет.',
    'case.taskLine': '{taskType} - срок {dueAt} - {priority}',
    'case.updates': 'Обновления кейса',
    'case.evidenceTrail': 'Трасса доказательств',
    'case.transcriptUnavailable': 'Транскрипт недоступен.',
    'case.addAnotherUpdate': 'Добавить ещё одно обновление',
    'reviewState.ready': 'готово',
    'reviewState.needs_review': 'нужен review',
    'reviewState.committed': 'закоммичено',
    'priority.high': 'Высокий',
    'priority.medium': 'Средний',
    'priority.low': 'Низкий',
    'task.follow_up': 'Повторный контакт'
  }
};

export function t(locale: AppLocale, key: TranslationKey, variables?: Record<string, string | number>): string {
  const template = messages[locale][key] || messages.en[key] || key;
  if (!variables) return template;
  return Object.entries(variables).reduce((current, [name, value]) => current.replaceAll(`{${name}}`, String(value)), template);
}

export function getModeLabel(locale: AppLocale, mode: AppMode): string {
  return t(locale, mode === 'demo' ? 'common.demo' : 'common.main');
}

export function formatReviewState(locale: AppLocale, reviewState: string): string {
  if (reviewState === 'ready' || reviewState === 'needs_review' || reviewState === 'committed') {
    return t(locale, `reviewState.${reviewState}` as TranslationKey);
  }
  return reviewState.replaceAll('_', ' ');
}

export function formatPriority(locale: AppLocale, priority: string): string {
  if (priority === 'high' || priority === 'medium' || priority === 'low') {
    return t(locale, `priority.${priority}` as TranslationKey);
  }
  return priority.replaceAll('_', ' ');
}

export function formatTaskType(locale: AppLocale, taskType: string): string {
  if (taskType === 'follow_up') {
    return t(locale, 'task.follow_up');
  }
  return taskType.replaceAll('_', ' ');
}

export function getFallbackFieldValueLabel(locale: AppLocale, value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return t(locale, 'common.notSet');
  return String(value).replaceAll('_', ' ');
}
