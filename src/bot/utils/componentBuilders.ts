import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type MessageActionRowComponentBuilder,
} from 'discord.js';

const DEFAULT_ACCENT = 0x5865f2;

export function createContainer(accentColor = DEFAULT_ACCENT): ContainerBuilder {
  return new ContainerBuilder().setAccentColor(accentColor);
}

export function createTitle(text: string): TextDisplayBuilder {
  return new TextDisplayBuilder().setContent(`# ${text}`);
}

export function createText(text: string): TextDisplayBuilder {
  return new TextDisplayBuilder().setContent(text);
}

export function createSeparator(): SeparatorBuilder {
  return new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);
}

export function createPageFooter(page: number, totalPages: number): TextDisplayBuilder {
  return new TextDisplayBuilder().setContent(`Page ${page} of ${totalPages}`);
}

export function disableAllButtons(
  row: ActionRowBuilder<MessageActionRowComponentBuilder>,
): ActionRowBuilder<MessageActionRowComponentBuilder> {
  const newRow = new ActionRowBuilder<MessageActionRowComponentBuilder>();
  for (const component of row.components) {
    if (component instanceof ButtonBuilder) {
      newRow.addComponents(ButtonBuilder.from(component.toJSON()).setDisabled(true));
    } else {
      newRow.addComponents(component);
    }
  }
  return newRow;
}

export function createPaginationRow(
  prefix: string,
  userId: string,
  guildId: string,
  page: number,
  totalPages: number,
  myRankDisabled: boolean,
): ActionRowBuilder<MessageActionRowComponentBuilder> {
  const id = (action: string) => `${prefix}:${action}:${userId}:${guildId}`;

  return new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(id('first'))
      .setLabel('<<')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 1),
    new ButtonBuilder()
      .setCustomId(id('prev'))
      .setLabel('<')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 1),
    new ButtonBuilder()
      .setCustomId(id('myrank'))
      .setLabel('My Rank')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(myRankDisabled),
    new ButtonBuilder()
      .setCustomId(id('next'))
      .setLabel('>')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages),
    new ButtonBuilder()
      .setCustomId(id('last'))
      .setLabel('>>')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages),
  );
}
